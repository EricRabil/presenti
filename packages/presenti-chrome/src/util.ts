export function debounce (fn: Function, wait = 1) {
  let timeout
  return function (...args) {
		if (timeout) return;
    timeout = setTimeout(() => {fn.call(this, ...args); timeout = null;}, wait)
  }
}