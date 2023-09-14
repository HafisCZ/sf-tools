class ScriptEditor extends SignalSource {
  #autocompleteRepository = [];

  constructor (element, scriptType) {
      super();

      this.editor = element;
      this.scriptType = scriptType;

      this.#createRepository();
      this.#createEditor();
  }

  #createRepository () {
      const constants = Constants.DEFAULT_CONSTANTS_VALUES;
      const constantsSuggestions = Array.from(constants).map((entry) => ({
          value: entry[0],
          text: entry[0].slice(1),
          type: 'constant'
      }))

      const config = this.scriptType === ScriptType.Table ? TABLE_EXPRESSION_CONFIG : DEFAULT_EXPRESSION_CONFIG;
      const configSuggestions = Array.from(config.entries()).map((entry) => ({
          value: entry[0],
          text: entry[0],
          type: entry[1].type
      }))

      const commands = ScriptCommands.commands().filter((command) => command.type === this.scriptType && typeof command.metadata.isDeprecated === 'undefined');
      const commandsSuggestions = commands.map((command) => ({
          value: command.autocompleteSyntax,
          text: command.encodedSyntax,
          type: 'command'
      }))

      this.#autocompleteRepository = [].concat(commandsSuggestions).concat(constantsSuggestions).concat(configSuggestions)
  }

  #applyStyles (sourceStyle, targetStyle) {
      targetStyle.setProperty('--offset-left', sourceStyle.paddingLeft);
      targetStyle.setProperty('--offset-top', sourceStyle.paddingTop);

      for (const style of ['font', 'fontFamily', 'lineHeight']) {
          targetStyle[style] = sourceStyle[style];
      }
  }

  #update () {
      const value = this.textarea.value;

      this.overlay.remove();
      this.overlay = this.overlayClone.cloneNode(true);

      const { html, info } = ScriptRenderer.render(value, this.scriptType);

      this.overlay.innerHTML = html;

      this.editor.insertAdjacentElement('beforeend', this.overlay);

      // Display info if needed
      if (info) {
          this.info.innerHTML = info;
          this.info.classList.add('visible');
      } else {
          this.info.classList.remove('visible');
      }

      this.emit('change', value);
  }

  #hideAutocomplete () {
      if (this.autocompleteActive) {
          this.autocomplete.classList.remove('visible');
          this.autocompleteActive = false;
      }
  }

  #applyAutocomplete (fragment) {
      const selection = this.selection;
      const value = this.textarea.value;

      this.textarea.value = value.slice(0, selection.end) + fragment + value.slice(selection.end);

      this.selection = {
          start: selection.end + fragment.length,
          end: selection.end + fragment.length,
          direction: selection.direction
      };

      this.#hideAutocomplete();
      this.#update();
      this.textarea.focus();
  }

  #showAutocomplete () {
      const value = this.textarea.value;

      const { end } = this.selection;
      const start = _lastIndexOfInSlice(value, '\n', 0, end - 1) + 1;

      const line = value.substring(start, end).trimStart();
      const word = line.slice(line.lastIndexOf(' ') + 1);

      const suggestions = this.#autocompleteRepository.filter((suggestion) => {
          return suggestion.type === 'command' ? suggestion.value.startsWith(line) : suggestion.value.startsWith(word);
      });

      if (suggestions.length > 0) {
          this.autocomplete.innerHTML = suggestions.map((suggestion) => {
              return `<div data-autocomplete-type="${suggestion.type}" data-autocomplete="${suggestion.value.slice(suggestion.type === 'command' ? line.length : word.length)}">${suggestion.text}</div>`
          }).join('');

          this.autocomplete.style.setProperty('--position-top', `${18 * _countInSlice(value, '\n', 0, end) + 18}px`);
          this.autocomplete.style.setProperty('--position-left', `${8 * (end - start)}px`);
          this.autocomplete.classList.add('visible');
          this.autocomplete.firstChild.setAttribute('data-selected', '');

          this.autocompleteActive = true;
      } else {
          this.#hideAutocomplete();
      }
  }

  #createEditor () {
      // Prepare editor
      this.editor.classList.add('ta-editor');

      // Create text area
      this.textarea = document.createElement('textarea');
      this.textarea.setAttribute('class', 'ta-editor-textarea');
      this.textarea.setAttribute('wrap', 'off');
      this.textarea.setAttribute('spellcheck', 'false');

      this.editor.insertAdjacentElement('beforeend', this.textarea);

      // Create overlay element
      this.overlay = document.createElement('div');
      this.overlay.setAttribute('class', 'ta-editor-overlay');

      this.editor.insertAdjacentElement('beforeend', this.overlay);

      // Create info element
      this.info = document.createElement('div');
      this.info.setAttribute('class', 'ta-editor-info');

      this.editor.insertAdjacentElement('beforeend', this.info);
              
      // Create context element
      this.autocomplete = document.createElement('div');
      this.autocomplete.setAttribute('class', 'ta-editor-autocomplete');

      this.editor.insertAdjacentElement('beforeend', this.autocomplete);

      // Compute styles
      const sourceStyle = getComputedStyle(this.textarea);
      this.#applyStyles(sourceStyle, this.overlay.style);
      this.#applyStyles(sourceStyle, this.autocomplete.style);

      // Overlay clone for faster render
      this.overlayClone = this.overlay.cloneNode(true);

      this.autocomplete.addEventListener('click', (event) => {
          const line = event.target.closest('[data-autocomplete]');
          if (line) {
              this.#applyAutocomplete(line.getAttribute('data-autocomplete'));
          }
      });

      this.textarea.addEventListener('input', () => {
          if (this.autocompleteActive) {
              this.#showAutocomplete();
          }

          this.#update();
      });

      this.textarea.addEventListener('focusout', (event) => {
          if (event.explicitOriginalTarget?.closest?.('[data-autocomplete]')) {
              // Do nothing
          } else {
              this.#hideAutocomplete();
          }
      });

      this.textarea.addEventListener('keydown', (event) => {
          if (event.ctrlKey && event.key === 's') {
              _stopAndPrevent(event);

              this.emit('ctrl+s');
          } else if (event.ctrlKey && event.shiftKey && event.key === 'S') {
              _stopAndPrevent(event);

              this.emit('ctrl+shift+s');
          } else if (event.ctrlKey && event.key === ' ') {
              _stopAndPrevent(event);

              this.#showAutocomplete();
          } else if (this.autocompleteActive) {
              if (event.key === 'Backspace' && this.textarea.value[this.textarea.selectionEnd - 1] === '\n') {
                  _stopAndPrevent(event);

                  this.#hideAutocomplete();
              } else if (event.key === 'Escape' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {        
                  this.#hideAutocomplete();
              } else if (event.key === 'Enter' || event.key === 'Tab') {
                  _stopAndPrevent(event);

                  const line = this.autocomplete.querySelector('[data-selected]');
                  if (line) {
                      this.#applyAutocomplete(line.getAttribute('data-autocomplete'));
                  }
              } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                  _stopAndPrevent(event);

                  const directionDown = event.key === 'ArrowDown';

                  const line = this.autocomplete.querySelector('[data-selected]');
                  line.removeAttribute('data-selected');

                  const adjacentLine = line?.[directionDown ? 'nextElementSibling' : 'previousElementSibling'] || (
                      directionDown ? this.autocomplete.firstElementChild : this.autocomplete.lastElementChild
                  );
                  adjacentLine.setAttribute('data-selected', '');

                  const currentScroll = this.autocomplete.scrollTop;
                  const isAbove = adjacentLine.offsetTop < currentScroll;
                  const isBelow = adjacentLine.offsetTop > currentScroll + this.autocomplete.offsetHeight - 20;

                  if (isAbove || isBelow) {
                      this.autocomplete.scroll({ top: adjacentLine.offsetTop + (isBelow ? 20 - this.autocomplete.offsetHeight : 0), behavior: 'instant' });
                  }
              }
          } else {
              if (event.key === 'Tab') {
                  _stopAndPrevent(event);

                  const a = this.textarea;
                  const s = a.selectionStart;
                  const d = a.selectionEnd;

                  let v = a.value;

                  if (s == d) {
                      a.value = v.substring(0, s) + '  ' + v.substring(s);
                      a.selectionStart = s + 2;
                      a.selectionEnd = d + 2;
                  } else {
                      let o = 0, oo = 0, i;
                      for (i = d - 1; i > s; i--) {
                          if (v[i] == '\n') {
                              v = v.substring(0, i + 1) + '  ' + v.substring(i + 1);
                              oo++;
                          }
                      }

                      while (i >= 0) {
                          if (v[i] == '\n') {
                              v = v.substring(0, i + 1) + '  ' + v.substring(i + 1);
                              o++;
                              break;
                          } else {
                              i--;
                          }
                      }

                      a.value = v;
                      a.selectionStart = s + o * 2;
                      a.selectionEnd = d + (oo + o) * 2;
                  }

                  this.#update();
              }
          }
      });

      this.textarea.addEventListener('paste', (event) => {
          _stopAndPrevent(event);

          const selection = this.selection;
          const content = this.textarea.value;
          const fragment = event.clipboardData.getData('text').replace(/\t/g, ' ')
  
          this.textarea.value = content.slice(0, selection.start) + fragment + content.slice(selection.end);
  
          this.selection = {
              start: selection.start + fragment.length,
              end: selection.start + fragment.length,
              direction: selection.direction
          };
  
          this.#update();
      });

      this.textarea.addEventListener('dragover', (event) => _stopAndPrevent(event));
      this.textarea.addEventListener('dragenter', (event) => _stopAndPrevent(event));
      this.textarea.addEventListener('drop', (event) => {
          const contentType = _dig(event, 'dataTransfer', 'files', 0, 'type')
          if (!contentType || contentType === 'text/plain') {
              _stopAndPrevent(event)

              const reader = new FileReader();
              reader.readAsText(event.dataTransfer.files[0], 'UTF-8');
              reader.onload = (file) => {
                  this.content = file.target.result;
              }
          }
      });

      this.textarea.addEventListener('click', () => {
          this.#hideAutocomplete();
      })

      this.#update();

      const updateMaskPosition = () => {
          this.editor.style.setProperty('--scroll-top', `-${this.textarea.scrollTop}px`);
          this.editor.style.setProperty('--scroll-left', `-${this.textarea.scrollLeft}px`);

          window.requestAnimationFrame(updateMaskPosition);
      }

      window.requestAnimationFrame(updateMaskPosition);
  }

  get selection () {
      return {
          start: this.textarea.selectionStart,
          end: this.textarea.selectionEnd,
          direction: this.textarea.selectionDirection
      };
  }

  set selection ({ start, end, direction }) {
      this.textarea.selectionStart = start;
      this.textarea.selectionEnd = end;
      this.textarea.selectionDirection = direction;
  }

  get content () {
      return this.textarea.value;
  }

  set content (text) {
      const previousText = this.textarea.value;
      const previousSelection = this.selection;

      this.textarea.value = text;
      this.#update();

      this.scrollTop();
      this.textarea.focus();

      this.selection = previousText === text ? previousSelection : { start: 0, end: 0 };
  }

  scrollTop () {
      this.textarea.scrollTo(0, 0);
  }
}