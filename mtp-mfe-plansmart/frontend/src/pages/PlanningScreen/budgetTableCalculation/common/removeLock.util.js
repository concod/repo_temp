export default function ({ accessor, rowInx }) {
  if (this.lockedCells[accessor]) {
    const newLockedRowInx = this.lockedCells[accessor].filter(
      (lockedRowInx) => lockedRowInx != rowInx
    );

    this.lockedCells[accessor] = newLockedRowInx;

    if (this.lockedCells[accessor].length === 0) {
      delete this.lockedCells[accessor];
    }
  }
}
