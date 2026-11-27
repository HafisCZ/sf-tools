#!/usr/bin/env ruby

# frozen_string_literal: true

require 'zip'
require 'httparty'
require 'json'

class Download
  URL_REQUEST_BUILD = 'https://crowdin.com/api/v2/projects/555523/translations/builds'
  URL_CHECK_BUILD = 'https://crowdin.com/api/v2/projects/555523/translations/builds/%<build_id>s'
  URL_DOWNLOAD_BUILD = 'https://crowdin.com/api/v2/projects/555523/translations/builds/%<build_id>s/download'
  URL_LIST_FILES = 'https://crowdin.com/api/v2/projects/555523/files?limit=500'
  URL_UPDATE_FILE = 'https://crowdin.com/api/v2/projects/555523/files/%<file_id>s'
  URL_UPLOAD_STORAGE = 'https://crowdin.com/api/v2/storages'

  SOURCE_FILE = 'en.json'
  LANG_DIR = File.expand_path('../js/lang', __dir__)
  ENV_FILE = File.expand_path('../.env', __dir__)

  def initialize(argv:)
    @command = argv[0]
    @token = read_token
  end

  def run
    case @command
    when nil, 'pull'
      pull
    when 'push'
      push
    when 'sync'
      push
      pull
    else
      abort 'Usage: ruby scripts/translations.rb [pull|push|sync]'
    end
  end

  private

  def pull
    build_id = request_build
    puts "Build #{build_id} scheduled"

    loop do
      sleep(10)
      break if build_finished?(build_id)

      puts 'Build not ready, waiting 10 seconds'
    end

    puts 'Downloading build'
    file = download_build(build_id)

    puts 'Unpacking files'
    changed = unpack_and_replace_files(file)
    puts changed.empty? ? 'No language files changed' : "Changed: #{changed.join(', ')}"
  end

  def push
    file_id = source_file_id
    storage_id = upload_to_storage(File.binread(File.join(LANG_DIR, SOURCE_FILE)))

    put(
      format(URL_UPDATE_FILE, file_id:),
      {
        storageId: storage_id,
        updateOption: 'clear_translations_and_approvals'
      }
    )

    puts "Uploaded #{SOURCE_FILE}"
  end

  def source_file_id
    file = get(URL_LIST_FILES)['data'].map { |item| item['data'] }.find { |data| data['name'] == SOURCE_FILE }
    abort "#{SOURCE_FILE} not found in the Crowdin project" if file.nil?

    file['id']
  end

  def upload_to_storage(content)
    parse(
      HTTParty.post(
        URL_UPLOAD_STORAGE,
        headers: headers.merge(
          {
            'Crowdin-API-FileName' => SOURCE_FILE
          }
        ),
        body: content
      )
    ).dig('data', 'id')
  end

  def read_token
    lines = File.exist?(ENV_FILE) ? File.readlines(ENV_FILE, chomp: true, encoding: 'bom|utf-8') : []
    line = lines.find { |text| text.start_with?('CROWDIN_TOKEN=') }
    abort "CROWDIN_TOKEN missing in #{ENV_FILE}" if line.nil?

    line.delete_prefix('CROWDIN_TOKEN=').strip
  end

  def download_build(build_id)
    url = get(format(URL_DOWNLOAD_BUILD, build_id:)).dig('data', 'url')

    HTTParty.get(url).body
  end

  def build_finished?(build_id)
    get(format(URL_CHECK_BUILD, build_id:)).dig('data', 'status') == 'finished'
  end

  def request_build
    post(URL_REQUEST_BUILD, {}).dig('data', 'id')
  end

  def unpack_and_replace_files(content)
    buffer = StringIO.new(content)
    changed = []

    Zip::InputStream.open(buffer) do |io|
      while (entry = io.get_next_entry)
        next unless entry.name.end_with?('.json')

        name = entry.name.split('/').last
        path = File.join(LANG_DIR, name)
        data = entry.get_input_stream.read.b
        next if File.exist?(path) && File.binread(path) == data

        File.binwrite(path, data)
        changed << name
      end
    end

    changed
  end

  def get(url)
    parse(
      HTTParty.get(url, headers:)
    )
  end

  def post(url, body)
    parse(
      HTTParty.post(url, headers:, body: body.to_json)
    )
  end

  def put(url, body)
    parse(
      HTTParty.put(url, headers:, body: body.to_json)
    )
  end

  def parse(response)
    abort "Crowdin request failed (#{response.code}): #{response.body}" unless response.success?

    JSON.parse(response.body)
  end

  def headers
    {
      'Authorization' => "Bearer #{@token}",
      'Content-Type' => 'application/json'
    }
  end
end

Download.new(argv: ARGV).run if __FILE__ == $0
