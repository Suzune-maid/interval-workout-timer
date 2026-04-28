export class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.tokens = new Set();
  }

  setFromString(value) {
    this.tokens = new Set(String(value || '').split(/\s+/).filter(Boolean));
    this.owner._className = [...this.tokens].join(' ');
  }

  add(...tokens) {
    for (const token of tokens) {
      if (token) {
        this.tokens.add(token);
      }
    }
    this.owner._className = [...this.tokens].join(' ');
  }

  remove(...tokens) {
    for (const token of tokens) {
      this.tokens.delete(token);
    }
    this.owner._className = [...this.tokens].join(' ');
  }

  contains(token) {
    return this.tokens.has(token);
  }
}

export class FakeElement {
  constructor(tagName, id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.listeners = new Map();
    this.attributes = new Map();
    this.textContent = '';
    this.disabled = false;
    this.type = '';
    this._innerHTML = '';
    this._className = '';
    this.classList = new FakeClassList(this);
  }

  set className(value) {
    this.classList.setFromString(value);
  }

  get className() {
    return this._className;
  }

  set innerHTML(value) {
    this._innerHTML = String(value ?? '');
    this.children = [];
    this.textContent = '';
  }

  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatchEvent(type) {
    for (const handler of this.listeners.get(type) ?? []) {
      handler({ currentTarget: this, target: this, type });
    }
  }

  click() {
    this.dispatchEvent('click');
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

export class FakeDocument {
  constructor(ids = []) {
    this.elements = new Map();
    for (const id of ids) {
      this.elements.set(id, new FakeElement('div', id));
    }
  }

  querySelector(selector) {
    if (!selector.startsWith('#')) {
      return null;
    }

    return this.elements.get(selector.slice(1)) ?? null;
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }
}

export function collectByDatasetValue(root, key, value) {
  const queue = [...(root?.children ?? [])];

  while (queue.length > 0) {
    const node = queue.shift();
    if (node?.dataset?.[key] === String(value)) {
      return node;
    }
    queue.push(...(node?.children ?? []));
  }

  return null;
}
