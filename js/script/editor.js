class ScriptEditor extends SignalSource {
  #autocompleteRepository = [];

  constructor(element, scriptType) {
    super();

    this.editor = element;
    this.scriptType = scriptType;

    this.#createEditor();
    this.#createAutocomplete();
    this.#createBindings();
  }

  #createBindings () {
    this.autocomplete.addEventListener('click', (event) => {
      const line = event.target.closest('[data-autocomplete]');
      if (line) {
        this.#applyAutocomplete(line);
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
      } else if (event.ctrlKey && event.shiftKey && event.key === 'X') {
        _stopAndPrevent(event);

        this.#handleComment();
      } else if (this.autocompleteActive) {
        if (event.key === 'Backspace' && this.textarea.value[this.textarea.selectionEnd - 1].match(/[\n\W]/)) {
          _stopAndPrevent(event);

          this.#hideAutocomplete();
        } else if (event.key === 'Escape' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          this.#hideAutocomplete();
        } else if (event.key === 'Enter' || event.key === 'Tab') {
          _stopAndPrevent(event);

          const line = this.autocomplete.querySelector('[data-selected]');
          if (line) {
            this.#applyAutocomplete(line);
          }
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          _stopAndPrevent(event);

          this.#handleAutocompleteNavigation(event);
        }
      } else if (event.key === 'Tab' && this.#focusPlaceholders()) {
        _stopAndPrevent(event);
      } else {
        if (event.key === 'Tab') {
          _stopAndPrevent(event);

          this.#handleTab(event.shiftKey);
        }
      }
    });

    this.textarea.addEventListener('paste', (event) => {
      _stopAndPrevent(event);

      const selection = this.selection;
      const content = this.textarea.value;
      const fragment = event.clipboardData.getData('text').replace(/\t/g, ' ')

      this.textarea.value = _emplaceSlice(content, fragment, selection.start, selection.end);

      this.selection = {
        start: selection.start + fragment.length,
        end: selection.start + fragment.length,
        direction: selection.direction
      };

      this.#destroyPlaceholders();
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

  #createAutocomplete() {
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
      value: command.syntax.fieldText,
      text: command.syntax.text,
      type: 'command'
    }))

    this.#autocompleteRepository = [].concat(commandsSuggestions).concat(constantsSuggestions).concat(configSuggestions)

    for (let i = 0; i < this.#autocompleteRepository.length; i++) {
      const suggestion = this.#autocompleteRepository[i];

      const element = document.createElement('div');
      element.setAttribute('data-autocomplete', i);
      element.setAttribute('data-autocomplete-type', suggestion.type);
      element.innerText = suggestion.text;

      this.autocomplete.appendChild(element);

      suggestion.id = `${i}`;
      suggestion.element = element;
    }
  }

  #applyStyles(sourceStyle, targetStyle) {
    targetStyle.setProperty('--offset-left', sourceStyle.paddingLeft);
    targetStyle.setProperty('--offset-top', sourceStyle.paddingTop);
  }

  #update() {
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

  #hideAutocomplete() {
    if (this.autocompleteActive) {
      this.autocomplete.classList.remove('visible');
      this.autocompleteActive = false;
    }
  }

  #applyAutocomplete(element) {
    const { value: suggestionValue, type } = this.#autocompleteRepository[element.getAttribute('data-autocomplete')];
    const offsetCommand = parseInt(this.autocomplete.getAttribute('data-command-offset'));
    const offsetGeneric = parseInt(this.autocomplete.getAttribute('data-generic-offset'));

    const fragment = suggestionValue.slice(type === 'command' ? offsetCommand : offsetGeneric);

    const selection = this.selection;
    const value = this.textarea.value;

    let selectionOffset = 0;

    if (type === 'function') {
      fragment = fragment + '()';
      selectionOffset = -1;
    }

    const isField = this.#isFieldSelected()
    if (isField) {
      selectionOffset -= selection.end - selection.start;
    }

    this.textarea.value = _emplaceSlice(value, fragment, isField ? selection.start : selection.end, selection.end);

    this.selection = {
      start: selection.end + fragment.length + selectionOffset,
      end: selection.end + fragment.length + selectionOffset,
      direction: selection.direction
    };

    this.#hideAutocomplete();
    this.#update();

    this.textarea.focus();

    this.#focusPlaceholders();
  }

  #destroyPlaceholders () {
    const value = this.textarea.value;

    if (value.includes('\u200b')) {
      let start = this.textarea.selectionStart;
      let end = this.textarea.selectionEnd;
  
      for (let i = 0; i < value.length; i++) {
        if (value[i] === '\u200b') {
          if (i <= start) start--;
          if (i <= end) end--;
        }
      }
  
      this.textarea.value = value.replace(/\u200b/g, '');
  
      this.textarea.selectionStart = start;
      this.textarea.selectionEnd = end;
    }
  }

  #focusPlaceholders () {
    const value = this.textarea.value;

    const indexes = [];
    for (let i = 0, ln = 0, lastIndexLn = -1; i < value.length; i++) {
      if (value[i] === '\n') ln++;
      else if (value[i] === '\u200b') {
        if (lastIndexLn === -1) {
          lastIndexLn = ln;
          indexes.push(i);
        } else if (ln === lastIndexLn) {
          indexes.push(i);
          lastIndexLn = -1;
        } else {
          this.#destroyPlaceholders();
          return false;
        }
      }
    }

    if (indexes.length > 0 && indexes.length % 2 === 0) {
      this.selection = {
        start: indexes[0],
        end: indexes[1] + 1,
        direction: 'forward'
      }

      return true;
    }
  }

  #getCursor () {
    const value = this.textarea.value;

    const selectionStart = this.textarea.selectionStart;
    const selectionEnd = this.textarea.selectionEnd;

    const lineFirstStart = Math.max(0, _lastIndexOfInSlice(value, '\n', 0, selectionStart - 1));
    const lineLastStart = _lastIndexOfInSlice(value, '\n', 0, selectionEnd - 1) + 1;

    return {
      selectionStart,
      selectionEnd,
      lineFirstStart,
      lineLastStart,
      lineLastEnd: value.indexOf('\n', selectionEnd) - 1,
      lineLastNumber: _countInSlice(value, '\n', 0, selectionEnd),
      lineLastCharacterNumber: selectionEnd - lineLastStart
    }
  }

  #isFieldSelected () {
    const value = this.textarea.value;
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;

    return value[start] === '\u200b' && value[end - 1] === '\u200b';
  }

  #getSuggestions () {
    const { lineLastStart, selectionEnd, lineLastNumber, lineLastCharacterNumber } = this.#getCursor();
  
    const value = this.textarea.value;
    const lineLast = value.substring(lineLastStart, selectionEnd).trimStart();
    const lineLastWord = lineLast.slice(lineLast.lastIndexOf(lineLast.match(/[^\w@]/g)?.pop() || ' ') + 1);

    if (this.#isFieldSelected()) {
      return {
        suggestions: this.#autocompleteRepository
          .filter((suggestion) => suggestion.type !== 'command')
          .map((suggestion) => suggestion.id),
        lineLast: '',
        lineLastWord: '',
        lineLastNumber,
        lineLastCharacterNumber: this.textarea.selectionStart - lineLastStart
      }
    } else {
      return {
        suggestions: this.#autocompleteRepository
          .filter((suggestion) => suggestion.type === 'command' ? suggestion.value.startsWith(lineLast) : suggestion.value.startsWith(lineLastWord))
          .map((suggestion) => suggestion.id),
        lineLast,
        lineLastWord,
        lineLastNumber,
        lineLastCharacterNumber
      }
    }
  }

  #showAutocomplete() {
    const { suggestions, lineLastNumber, lineLastCharacterNumber, lineLast, lineLastWord } = this.#getSuggestions();

    if (suggestions.length > 0) {
      for (const { element, id } of this.#autocompleteRepository) {
        if (suggestions.includes(id)) {
          element.classList.add('visible');
        } else {
          element.classList.remove('visible');
        }
      }

      this.autocomplete.setAttribute('data-command-offset', lineLast.length);
      this.autocomplete.setAttribute('data-generic-offset', lineLastWord.length);
      this.autocomplete.style.setProperty('--position-top', `${18 * (lineLastNumber + 1)}px`);
      this.autocomplete.style.setProperty('--position-left', `${8 * (lineLastCharacterNumber)}px`);
      this.autocomplete.classList.add('visible');

      for (const element of this.autocomplete.querySelectorAll('[data-selected]')) {
        element.removeAttribute('data-selected');
      }

      this.autocomplete.querySelector('[data-autocomplete].visible').setAttribute('data-selected', '');

      this.autocompleteActive = true;
    } else {
      this.#hideAutocomplete();
    }
  }

  #handleAutocompleteNavigation (event) {
    const directionDown = event.key === 'ArrowDown';

    const line = this.autocomplete.querySelector('[data-selected]');
    line.removeAttribute('data-selected');

    let adjacentLine = line;
    do {
      adjacentLine = adjacentLine[directionDown ? 'nextElementSibling' : 'previousElementSibling'];
    } while (adjacentLine && !adjacentLine.classList.contains('visible'));

    adjacentLine ||= (directionDown ? this.autocomplete.firstElementChild : this.autocomplete.lastElementChild);
    adjacentLine.setAttribute('data-selected', '');

    const currentScroll = this.autocomplete.scrollTop;
    const isAbove = adjacentLine.offsetTop < currentScroll;
    const isBelow = adjacentLine.offsetTop > currentScroll + this.autocomplete.offsetHeight - 20;

    if (isAbove || isBelow) {
      this.autocomplete.scroll({ top: adjacentLine.offsetTop + (isBelow ? 20 - this.autocomplete.offsetHeight : 0), behavior: 'instant' });
    }
  }

  #handleComment () {
    let originalContent = this.textarea.value;
    let currentContent = this.textarea.value;
    let currentOffset = 0;

    const { lineFirstStart, lineLastEnd, selectionStart, selectionEnd } = this.#getCursor();

    let start = selectionStart;
    let end = selectionEnd;

    if (_lineStartsWith(originalContent, '#', lineFirstStart, lineLastEnd)) {
      for (let i = lineFirstStart; i < lineLastEnd + 1; i++) {
        if (i !== lineFirstStart && originalContent[i - 1] !== '\n') {
          // If we encounter new line, save it
          continue;
        } else if (originalContent[i] === '#') {
          // If current line starts with one space
          currentContent = _emplaceSlice(currentContent, '', i + currentOffset, i + currentOffset + 1);
          currentOffset -= 1;

          if (i < selectionStart) start -= 1;
          if (i < selectionEnd) end -= 1;
        }
      }
    } else {
      for (let i = lineFirstStart; i < selectionEnd; i++) {
        if (i === 0 || (i !== lineFirstStart && originalContent[i - 1] === '\n')) {
          currentContent = _emplaceSlice(currentContent, '#', i + currentOffset, i + currentOffset);
          currentOffset += 1;

          if (i < selectionStart) start += 1;
          end += 1;
        }
      }
    }

    this.textarea.value = currentContent;
    this.textarea.selectionStart = Math.max(0, start);
    this.textarea.selectionEnd = Math.max(Math.max(0, start), end);

    this.#destroyPlaceholders();
    this.#update();
  }

  #handleTab (subtractMode = false) {
    let originalContent = this.textarea.value;
    let currentContent = this.textarea.value;
    let currentOffset = 0;

    const { lineFirstStart, lineLastEnd, selectionStart, selectionEnd } = this.#getCursor();

    let start = selectionStart;
    let end = selectionEnd;

    if (subtractMode) {
      for (let i = lineFirstStart; i < lineLastEnd + 1; i++) {
        if (i !== lineFirstStart && originalContent[i - 1] !== '\n') {
          // If we encounter new line, save it
          continue;
        } else if (originalContent[i] === ' ' && originalContent[i + 1] === ' ') {
          // If current like starts with two spaces
          currentContent = _emplaceSlice(currentContent, '', i + currentOffset, i + currentOffset + 2);
          currentOffset -= 2;

          if (i < selectionStart) start -= 2;
          if (i < selectionEnd) end -= 2;
        } else if (originalContent[i] === ' ') {
          // If current line starts with one space
          currentContent = _emplaceSlice(currentContent, '', i + currentOffset, i + currentOffset + 1);
          currentOffset -= 1;

          if (i < selectionStart) start -= 1;
          if (i < selectionEnd) end -= 1;
        }
      }
    } else if (selectionStart === selectionEnd) {
      // If selection is 0 characters long, just insert two spaces at current selection
      currentContent = _emplaceSlice(currentContent, '  ', selectionStart, selectionStart);

      start += 2;
      end += 2;
    } else {
      for (let i = lineFirstStart; i < selectionEnd; i++) {
        if (i === 0 || (i !== lineFirstStart && originalContent[i - 1] === '\n')) {
          currentContent = _emplaceSlice(currentContent, '  ', i + currentOffset, i + currentOffset);
          currentOffset += 2;

          if (i < selectionStart) start += 2;
          end += 2;
        }
      }
    }

    this.textarea.value = currentContent;
    this.textarea.selectionStart = Math.max(0, start);
    this.textarea.selectionEnd = Math.max(Math.max(0, start), end);

    this.#destroyPlaceholders();
    this.#update();
  }

  #createEditor() {
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
  }

  get selection() {
    return {
      start: this.textarea.selectionStart,
      end: this.textarea.selectionEnd,
      direction: this.textarea.selectionDirection
    };
  }

  set selection({ start, end, direction }) {
    this.textarea.selectionStart = start;
    this.textarea.selectionEnd = end;
    this.textarea.selectionDirection = direction;
  }

  get content() {
    return this.textarea.value;
  }

  set content(text) {
    const previousText = this.textarea.value;
    const previousSelection = this.selection;

    this.textarea.value = text;

    this.#destroyPlaceholders();
    this.#update();

    this.scrollTop();
    this.textarea.focus();

    this.selection = previousText === text ? previousSelection : { start: 0, end: 0 };
  }

  scrollTop() {
    this.textarea.scrollTo(0, 0);
  }
}