class ScriptEditor extends SignalSource {
  #suggestions = [];
  #editorVisible = false;
  #updateOverlays = null;

  constructor(element, scriptType) {
    super();

    this.editor = element;
    this.scriptType = scriptType;

    this.#setupEditor();
    this.#setupMeasurements();
    this.#setupSuggestions();
    this.#setupBindings();
    this.#update();
  }

  #setupBindings () {
    this.suggestions.addEventListener('click', (event) => {
      const line = event.target.closest('[data-suggestion]');
      if (line) {
        this.#applySuggestion(line);
      }
    });

    this.textarea.addEventListener('input', () => {
      if (this.suggestionsActive) {
        this.#updateSuggestions();
      }

      this.#update();
    });

    this.textarea.addEventListener('focusout', (event) => {
      if (event.explicitOriginalTarget?.closest?.('[data-suggestion]')) {
        // Do nothing
      } else {
        this.#hideSuggestions();
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

        this.#updateSuggestions();
      } else if (event.ctrlKey && event.shiftKey && event.key === 'X') {
        _stopAndPrevent(event);

        this.#handleComment();
      } else if (this.suggestionsActive) {
        if (event.key === 'Backspace' && this.textarea.value[this.textarea.selectionEnd - 1].match(/[\n\W]/)) {
          _stopAndPrevent(event);

          this.#hideSuggestions();
        } else if (event.key === 'Escape' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          this.#hideSuggestions();
        } else if (event.key === 'Enter' || event.key === 'Tab') {
          _stopAndPrevent(event);

          const line = this.suggestions.querySelector('[data-selected]');
          if (line) {
            this.#applySuggestion(line);
          }
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          _stopAndPrevent(event);

          this.#handleSuggestionsNavigation(event);
        }
      } else if (event.key === 'Tab' && (event.shiftKey ? this.#focusPreviousField() : this.#focusNextField())) {
        _stopAndPrevent(event);
      } else if (event.key === 'Tab') {
        _stopAndPrevent(event);

        this.#handleTab(event.shiftKey);
      }
    });

    this.textarea.addEventListener('paste', (event) => {
      _stopAndPrevent(event);

      this.textarea.setRangeText(
        event.clipboardData.getData('text').replace(/\t/g, ' '),
        this.textarea.selectionStart,
        this.textarea.selectionEnd,
        'end'
      );

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
      this.#hideSuggestions();
    })

    window.addEventListener('selectionchange', (event) => {
      if (event.target === this.textarea) {
        const { start, end, endLine, endCharacter, lines } = this.#getSelectedLines();

        if (this.bar) {
          this.bar.innerHTML = `<span>Ln ${endLine + 1}, Col ${endCharacter + 1}${start === end ? '' : ` (${end - start} selected)`}</span>`;
        }

        this.#removeHighlights();
        this.#updateCursor(start, end, lines);
      }
    })

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].intersectionRatio > 0) {
        this.#handleEditorVisibility(true);
      } else {
        this.#handleEditorVisibility(false);
      }
    })

    this.observer.observe(this.textarea, { threshold: 1.0 });

    this.#updateOverlays = (function () {
      this.editor.style.setProperty('--scroll-top', `-${this.textarea.scrollTop}px`);
      this.editor.style.setProperty('--scroll-left', `-${this.textarea.scrollLeft}px`);

      if (this.#editorVisible) {
        window.requestAnimationFrame(this.#updateOverlays);
      }
    }).bind(this)
  }

  #updateCursor (start, end, lines) {
    const value = this.textarea.value;

    if (start === end) {
      let character = null;
      let positionLeft = null;
      let positionRight = null;

      if (Expression.TERMINATORS[value[start]]) {
        character = Expression.TERMINATORS[value[start]];
        positionLeft = start;
      } else if (Expression.TERMINATORS_INVERTED[value[start]]) {
        character = Expression.TERMINATORS_INVERTED[value[start]];
        positionRight = start;
      } else if (Expression.TERMINATORS[value[start - 1]]) {
        character = Expression.TERMINATORS[value[start - 1]];
        positionLeft = start - 1;
      } else if (Expression.TERMINATORS_INVERTED[value[start - 1]]) {
        character = Expression.TERMINATORS_INVERTED[value[start - 1]];
        positionRight = start - 1;
      }

      if (character) {
        const { start, end, index } = lines[0];
        const stack = [character];

        if (positionLeft === null) {
          for (let i = positionRight - 1; i >= start; i--) {
            if (value[i] === stack[0]) {
              stack.shift();

              if (stack.length === 0) {
                positionLeft = i;
                break;
              }
            } else if (Expression.TERMINATORS_ALL[value[i]]) {
              stack.unshift(Expression.TERMINATORS_ALL[value[i]]);
            }
          }
        } else if (positionRight === null) {
          for (let i = positionLeft + 1; i <= end; i++) {
            if (value[i] === stack[0]) {
              stack.shift();

              if (stack.length === 0) {
                positionRight = i;
                break;
              }
            } else if (Expression.TERMINATORS_ALL[value[i]]) {
              stack.unshift(Expression.TERMINATORS_ALL[value[i]]);
            }
          }
        }

        if (positionLeft !== null) {
          this.#highlight(index, positionLeft - start);
        }

        if (positionRight !== null) {
          this.#highlight(index, positionRight - start);
        }
      }
    }
  }

  #removeHighlights () {
    for (const element of this.highlights) {
      element.remove();
    }
  }

  #highlight (line, character) {
    const element = document.createElement('div');
    element.innerHTML = '&nbsp;';
    element.setAttribute('class', 'ta-editor-highlight');
    element.style.setProperty('--position-top', `${this.characterHeight * line}px`);
    element.style.setProperty('--position-left', `${this.characterWidth * character}px`);

    this.editor.appendChild(element);

    this.highlights.push(element);
  }

  #handleEditorVisibility (visible) {
    this.#editorVisible = visible;

    if (this.#editorVisible) {
      window.requestAnimationFrame(this.#updateOverlays);
    }
  }

  #setupSuggestions () {
    this.#suggestions = [
      ScriptCommands.commands().filter((command) => command.type & this.scriptType && typeof command.metadata.isDeprecated === 'undefined').map((command) => ({
        value: command.syntax.fieldText,
        text: command.syntax.text,
        type: 'command'
      })),
      Array.from(TABLE_EXPRESSION_CONFIG.entries()).filter((entry) => !entry[1].isInternal).map((entry) => ({
        value: entry[1].syntax.fieldText,
        text: entry[0],
        type: entry[1].type
      })),
      Array.from(Constants.DEFAULT_CONSTANTS_VALUES).map((entry) => ({
        value: entry[0],
        text: entry[0].slice(1),
        type: 'constant'
      }))
    ].flat()

    for (let i = 0; i < this.#suggestions.length; i++) {
      const suggestion = this.#suggestions[i];

      const element = document.createElement('div');
      element.setAttribute('data-suggestion', i);
      element.setAttribute('data-suggestion-type', suggestion.type);
      element.innerText = suggestion.text;

      this.suggestions.appendChild(element);

      suggestion.id = `${i}`;
      suggestion.element = element;
    }
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

  #hideSuggestions() {
    if (this.suggestionsActive) {
      this.suggestions.classList.remove('visible');
      this.suggestionsActive = false;
    }
  }

  #applySuggestion(element) {
    const { value, type } = this.#suggestions[element.getAttribute('data-suggestion')];
    const { start, end, lines } = this.#getSelectedLines();
    const { line, word } = this.#getSuggestionContent(lines[lines.length - 1].start, end);

    let offset = 0;
    let fragment = value.slice(type === 'command' ? line.length : word.length);

    const isField = this.#isField(this.textarea.value, start, end);
    if (isField) {
      offset -= end - start;
    }

    this.textarea.setRangeText(fragment, isField ? start : end, end);

    if (value.includes(FIELD_L)) {
      this.textarea.setSelectionRange(
        start,
        start,
        'forward'
      );
    } else {
      this.textarea.setSelectionRange(
        end + fragment.length + offset,
        end + fragment.length + offset,
        'forward'
      );
    }

    this.#hideSuggestions();
    this.#update();

    this.textarea.focus();

    this.#focusNextField();
  }

  #removeFields () {
    const value = this.textarea.value;

    if (value.includes(FIELD_L) || value.includes(FIELD_R)) {
      let offset = 0;

      for (let i = 0; i < value.length; i++) {
        if (value[i] === FIELD_L || value[i] === FIELD_R) {
          this.textarea.setRangeText('', i + offset, i + offset + 1);
          offset -= 1;
        }
      }
    }
  }

  #focusPreviousField () {
    const value = this.textarea.value;
    const start = this.textarea.selectionStart;
    
    for (let i = start - 1, fieldEnd = null; i >= 0; i--) {
      if (value[i] === '\n') fieldEnd = null;
      else if (value[i] === FIELD_R) fieldEnd = i + 1;
      else if (value[i] === FIELD_L && fieldEnd !== null) {
        this.textarea.setSelectionRange(i, fieldEnd, 'forward');

        return true;
      }
    }

    for (let i = value.length - 1, fieldEnd = null; i > start; i--) {
      if (value[i] === '\n') fieldEnd = null;
      else if (value[i] === FIELD_R) fieldEnd = i + 1;
      else if (value[i] === FIELD_L && fieldEnd !== null) {
        this.textarea.setSelectionRange(i, fieldEnd, 'forward');

        return true;
      }
    }

    return false;
  }

  #focusNextField () {
    const value = this.textarea.value;
    const end = this.textarea.selectionEnd;
    
    for (let i = end, fieldStart = null; i < value.length; i++) {
      if (value[i] === '\n') fieldStart = null;
      else if (value[i] === FIELD_L) fieldStart = i;
      else if (value[i] === FIELD_R && fieldStart !== null) {
        this.textarea.setSelectionRange(fieldStart, i + 1, 'forward');

        return true;
      }
    }

    for (let i = 0, fieldStart = null; i < end; i++) {
      if (value[i] === '\n') fieldStart = null;
      else if (value[i] === FIELD_L) fieldStart = i;
      else if (value[i] === FIELD_R && fieldStart !== null) {
        this.textarea.setSelectionRange(fieldStart, i + 1, 'forward');

        return true;
      }
    }

    return false;
  }

  #getSelectedLines () {
    const value = this.textarea.value;

    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;

    // Find start of current selection
    const startBlock = Math.max(0, _lastIndexOfInSlice(value, '\n', 0, start - 1) + 1);

    const lines = [];
    let line = null;
    let lineIndex = 0;
    
    for (let i = 0; i < startBlock; i++) {
      if (value[i] === '\n') lineIndex++;
    }

    for (let i = startBlock; i <= value.length; i++) {
      if (line === null) {
        // Create line if null (either initial iteration or after encountering a new line)
        lines.push(line = { start: i, end: null, index: lineIndex++ });
      }

      if (value[i] === '\n') {
        // End line when encountering new line
        line.end = i;
        line = null;

        if (i >= end) {
          break;
        }
      }
    }

    // Set end of last line to value length if it was not terminated by new line
    if (line) line.end = value.length;

    // Get last line for end character index
    const lastLine = lines[lines.length - 1];

    return {
      start,
      startCharacter: start - startBlock,
      startLine: lines[0].index,
      end,
      endCharacter: end - lastLine.start,
      endLine: lastLine.index,
      lines
    }
  }

  #isField (content, start, end) {
    return content[start] === FIELD_L && content[end - 1] === FIELD_R;
  }

  #getSuggestionContent (start, end) {
    const value = this.textarea.value;

    const line = value.substring(start, end).trimStart();
    const word = line.slice(line.lastIndexOf(line.match(/[^\w@]/g)?.pop() || ' ') + 1);

    return {
      line,
      word
    }
  }

  #getSuggestions () {
    const { start, end, startCharacter, endCharacter, lines, endLine } = this.#getSelectedLines();

    if (this.#isField(this.textarea.value, start, end)) {
      return {
        suggestions: this.#suggestions
          .filter((suggestion) => suggestion.type !== 'command')
          .map((suggestion) => suggestion.id),
        charIndex: startCharacter,
        lineIndex: endLine
      }
    } else {
      const { line, word } = this.#getSuggestionContent(lines[lines.length - 1].start, end);

      return {
        suggestions: this.#suggestions
          .filter((suggestion) => suggestion.type === 'command' ? suggestion.value.startsWith(line) : suggestion.value.startsWith(word))
          .map((suggestion) => suggestion.id),
        charIndex: endCharacter,
        lineIndex: endLine
      }
    }
  }

  #updateSuggestions () {
    const { suggestions, charIndex, lineIndex } = this.#getSuggestions();

    if (suggestions.length > 0) {
      for (const { element, id } of this.#suggestions) {
        if (suggestions.includes(id)) {
          element.classList.add('visible');
        } else {
          element.classList.remove('visible');
        }
      }

      this.suggestions.style.setProperty('--position-top', `${this.characterHeight * (lineIndex + 1)}px`);
      this.suggestions.style.setProperty('--position-left', `${this.characterWidth * (charIndex)}px`);
      this.suggestions.classList.add('visible');

      for (const element of this.suggestions.querySelectorAll('[data-selected]')) {
        element.removeAttribute('data-selected');
      }

      this.suggestions.querySelector('[data-suggestion].visible').setAttribute('data-selected', '');

      this.suggestionsActive = true;
    } else {
      this.#hideSuggestions();
    }
  }

  #handleSuggestionsNavigation (event) {
    const directionDown = event.key === 'ArrowDown';

    const line = this.suggestions.querySelector('[data-selected]');
    line.removeAttribute('data-selected');

    let adjacentLine = line;
    do {
      adjacentLine = adjacentLine[directionDown ? 'nextElementSibling' : 'previousElementSibling'];
    } while (adjacentLine && !adjacentLine.classList.contains('visible'));

    adjacentLine ||= (directionDown ? this.suggestions.querySelector('[data-suggestion].visible') : this.suggestions.querySelector('[data-suggestion].visible:last-child'));
    adjacentLine.setAttribute('data-selected', '');

    const currentScroll = this.suggestions.scrollTop;
    const isAbove = adjacentLine.offsetTop < currentScroll;
    const isBelow = adjacentLine.offsetTop > currentScroll + this.suggestions.offsetHeight - 20;

    if (isAbove || isBelow) {
      this.suggestions.scroll({ top: adjacentLine.offsetTop + (isBelow ? 20 - this.suggestions.offsetHeight : 0), behavior: 'instant' });
    }
  }

  #handleComment () {
    let content = this.textarea.value;
    let offset = 0;

    const { lines } = this.#getSelectedLines();

    if (lines.some(({ start, end }) => start !== end && content[start] !== '#')) {
      for (const { start, end } of lines) {
        if (start !== end && content[start] !== '#') {
          this.textarea.setRangeText('#', start + offset, start + offset);
          offset += 1;
        }
      }
    } else {
      for (const { start } of lines) {
        if (content[start] === '#') {
          this.textarea.setRangeText('', start + offset, start + offset + 1);
          offset -= 1;
        }
      }
    }

    this.#update();
  }

  #handleTab (subtractMode = false) {
    let content = this.textarea.value;
    let offset = 0;

    const { start, end, lines } = this.#getSelectedLines();

    if (subtractMode) {
      for (const { start, end } of lines) {
        if (start + 1 < end && content[start] === ' ' && content[start + 1] === ' ') {
          this.textarea.setRangeText('', start + offset, start + offset + 2);
          offset -= 2;
        } else if (start < end && content[start] === ' ') {
          this.textarea.setRangeText('', start + offset, start + offset + 1);
          offset -= 1;
        }
      }
    } else if (start === end) {
      // If selection is 0 characters long, just insert two spaces at current selection
      this.textarea.setRangeText('  ', start, start, 'end');
    } else {
      for (const { start, end } of lines) {
        if (start !== end) {
          this.textarea.setRangeText('  ', start + offset, start + offset);
          offset += 2;
        }
      }
    }

    this.#update();
  }

  #setupMeasurements () {
    const measure = document.createElement('div');
    measure.setAttribute('class', 'ta-editor-measure');
    measure.innerHTML = '&nbsp;';

    document.body.appendChild(measure);

    this.characterHeight = measure.clientHeight;
    this.characterWidth = measure.clientWidth;

    measure.remove();
  }

  #setupEditor() {
    // Prepare editor
    this.editor.classList.add('ta-editor');

    // Create text area
    this.textarea = document.createElement('textarea');
    this.textarea.setAttribute('class', 'ta-editor-textarea');
    this.textarea.setAttribute('wrap', 'off');
    this.textarea.setAttribute('spellcheck', 'false');

    this.editor.insertAdjacentElement('beforeend', this.textarea);

    if (this.scriptType === ScriptType.Table) {
      // Create bar element
      this.bar = document.createElement('div');
      this.bar.setAttribute('class', 'ta-editor-bar');
  
      this.editor.insertAdjacentElement('beforeend', this.bar);
      this.editor.classList.add('with-ta-editor-bar');
    }

    // Create overlay element
    this.overlay = document.createElement('div');
    this.overlay.setAttribute('class', 'ta-editor-overlay');

    this.editor.insertAdjacentElement('beforeend', this.overlay);

    // Create info element
    this.info = document.createElement('div');
    this.info.setAttribute('class', 'ta-editor-info');

    this.editor.insertAdjacentElement('beforeend', this.info);

    // Create context element
    this.suggestions = document.createElement('div');
    this.suggestions.setAttribute('class', 'ta-editor-suggestions');

    this.editor.insertAdjacentElement('beforeend', this.suggestions);

    this.highlights = [];

    // Compute styles
    const sourceStyle = getComputedStyle(this.textarea);
    this.editor.style.setProperty('--offset-left', sourceStyle.paddingLeft);
    this.editor.style.setProperty('--offset-top', sourceStyle.paddingTop);

    // Overlay clone for faster render
    this.overlayClone = this.overlay.cloneNode(true);
  }

  get content() {
    return this.textarea.value.replaceAll(FIELD_REGEXP, '');
  }

  set content(text) {
    const previousText = this.textarea.value;
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;

    this.textarea.value = text.replaceAll(FIELD_REGEXP, '');

    this.#update();

    this.scrollTop();
    this.textarea.focus();

    if (previousText === text) {
      this.textarea.setSelectionRange(start, end, 'forward')
    } else {
      this.textarea.setSelectionRange(0, 0, 'forward')
    }
  }

  scrollTop() {
    this.textarea.scrollTo(0, 0);
  }
}