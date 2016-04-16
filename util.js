class Util {

  static always(val) {
    return () => val;
  }

  static noop() {}

  static fn(val) {
    return typeof val === 'function' ? val :
      typeof val === 'object' ? (key => val[key]) :
      this.always(val);
  }

  static newArray(n, fn) {
    fn = this.fn(fn);
    const array = new Array(n);
    for (let i = 0; i < n; i++)
      array[i] = fn(i);
    return array;
  }

  static newMatrix(n, fn) {
    fn = this.fn(fn);
    return this.newArray(n, i => this.newArray(n, j => fn(i, j)))
  }

  static insertStyle(style) {
    const $style = document.createElement('style');
    $style.innerText = style;
    document.head.appendChild($style);
    return $style;
  }

  static leftPad(length, src, char) {
    return (src.length < length ? (char || ' ').repeat(length - src.length) : '') + src;
  }

  static color(r, g, b) {
    return '#' + this.leftPad(6, (r * 65536 + g * 256 + b).toString(16), '0');
  }

  static gray(gray) {
    return this.color(gray, gray, gray);
  }

  static grayByPercent(grayPercent) {
    return this.gray(Math.floor(255 * grayPercent));
  }

  static randomFromStream(size, stream) {
    for (let element of stream)
      if (Math.random() * (size--) < 1)
        return element;
  }

}
