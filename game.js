class Game {

  constructor(config) {
    this.fnOver = config.fnOver || Util.noop;
    this.size = Math.max(config.size || 4, 2);
    this.$container = config.$container;
    this.count = {
      total: Math.pow(this.size, 2),
      taken: 0,
      get left() {
        return this.total - this.taken;
      },
      newGridValueUpperBound: config.newGridValueUpperBound || 2
    };
    this.count.gridValueUpperBound = this.count.newGridValueUpperBound + this.count.total - 1;
    this.gridCaption = Util.newArray(
      this.count.gridValueUpperBound,
      Util.fn(config.caption || (i => Math.pow(2, i)))
    );
    this.timeoutForGridLast = config.timeoutForGridLast || 20;
    this.timeoutForMove = config.timeoutForMove || 200;
    this.$gridColorStyle = Util.insertStyle();
    this.classForGrid = config.classForGrid || 'grid';
    this.classForGridValue = config.classForGridValue || (gridValue => 'grid-value-' + gridValue);
    this.classForGridLast = config.classForGridLast || 'grid-last';
    this.setGridColor(
      Util.fn(config.foreground || (i => Util.grayByPercent(i / (this.count.gridValueUpperBound - 1)))),
      Util.fn(config.background || (i => Util.grayByPercent(1 - i / (this.count.gridValueUpperBound - 1))))
    );
    this.margin = config.margin || 4;
    this.gridWidthPlusMargin = (100 - this.margin) / this.size;
    this.gridWidth = this.gridWidthPlusMargin - this.margin;
    Util.insertStyle(`.grid {
      width: ${this.gridWidth}%;
      height: ${this.gridWidth}%;
    }`);
    this.board = Util.newMatrix(this.size);
    this.placeNewGrid();
  }

  percent(index) {
    return (this.margin + this.gridWidthPlusMargin * index) + '%';
  }

  setGridColor(fg, bg) {
    fg = Util.fn(fg);
    bg = Util.fn(bg);
    this.$gridColorStyle.innerText = Util.newArray(
      this.count.gridValueUpperBound,
      i => `.${this.classForGridValue(i)} { color: ${fg(i)}; background-color: ${bg(i)}; }`
    ).join('');
  }

  *empties() {
    let left = this.count.left;
    for (let i = 0; i < this.size; i++)
      for (let j = 0; j < this.size; j++)
        if (!this.board[i][j]) {
          yield [i, j];
          if (--left <= 0) {
            return;
          }
        }
  }

  randomEmpty() {
    return Util.randomFromStream(this.count.left, this.empties());
  }

  placeNewGrid() {
    const position = this.randomEmpty();
    return position && this.place(this.newGrid(), position[0], position[1]);
  }

  place(grid, i, j) {
    this.gridLast = grid;
    grid.$element = document.createElement('div');
    grid.$element.innerText = this.gridCaption[grid.value];
    grid.$element.classList.add(this.classForGrid, this.classForGridValue(grid.value), this.classForGridLast);
    setTimeout(() => grid.$element.classList.remove(this.classForGridLast), this.timeoutForGridLast);
    grid.$element.style.left = this.percent(j);
    grid.$element.style.top = this.percent(i);
    this.board[i][j] = grid;
    grid.i = i;
    grid.j = j;
    this.count.taken++;
    this.$container.appendChild(grid.$element);
    return grid;
  }

  newGrid() {
    return {
      value: Math.floor(Math.random() * this.count.newGridValueUpperBound)
    };
  }

  movable() {
    if (this.count.left > 0) {
      return true;
    }
    const gridValue = (i, j) => {
      const grid = this.board[i][j];
      return grid ? grid.value : -1;
    };
    for (let i = 0; i < this.size; i++)
      for (let j = 1; j < this.size; j++)
        if (gridValue(i, j) === gridValue(i, j - 1) || gridValue(j, i) === gridValue(j - 1, i))
          return true;
    return false;
  }

  act(eventType) {
    const handler = {
      left: [false, false],
      right: [false, true],
      up: [true, false],
      down: [true, true]
    }[eventType];
    if (!handler)
      return;
    if (this.move(...handler)) {
      const grid = this.placeNewGrid();
      this.movable() || setTimeout(
        this.fnOver,
        grid ? Math.max(this.timeoutForMove, this.timeoutForGridLast) : this.timeoutForMove
      );
    }
  }

  move(transpose, reverse) {
    const ij = transpose ? 'i' : 'j';
    const leftTop = transpose ? 'top' : 'left';
    const margin = reverse ? (j => this.size - 1 - j) : (j => j);
    const transform = transpose ? ((i, j) => [margin(j), i]) : ((i, j) => [i, margin(j)]);
    const getGrid = (i, j) => {
      const position = transform(i, j);
      return this.board[position[0]][position[1]];
    };
    const setGrid = (i, j, grid) => {
      const position = transform(i, j);
      this.board[position[0]][position[1]] = grid;
    };
    let moved = false;
    for (let i = 0; i < this.size; i++) {
      let last = null;
      const row = [];
      for (let j = 0; j < this.size; j++) {
        let current = getGrid(i, j);
        if (!current)
          continue;
        if (!last) {
          last = current;
          continue;
        }
        if (last.value === current.value) {
          moved = true;
          this.count.taken--;
          last.$element.style[leftTop] = this.percent(margin(row.length));
          row.push(current);
          this.gridLevelUp(last).then(grid => grid.$element.remove());
          this.gridLevelUp(current);
          last = null;
        } else {
          row.push(last);
          last = current;
        }
      }
      if (last) {
        row.push(last);
        moved = moved || (margin(last[ij]) !== row.length - 1);
      }
      row.forEach((grid, j) => {
        setGrid(i, j, grid);
        grid[ij] = margin(j);
        grid.$element.style[leftTop] = this.percent(grid[ij]);
      });
      for (let j = row.length; j < this.size; j++) {
        setGrid(i, j);
      }
    }
    return moved;
  }

  gridLevelUp(grid) {
    return new Promise((resolve) => setTimeout(() => {
      grid.$element.classList.remove(this.classForGridValue(grid.value));
      grid.$element.classList.add(this.classForGridValue(++grid.value));
      grid.$element.innerText = this.gridCaption[grid.value];
      resolve(grid);
    }, this.timeoutForMove));
  }

}
