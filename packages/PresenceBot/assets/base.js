window.addEventListener('DOMContentLoaded', () => {
  const dropdowns = Array.from(document.querySelectorAll('[data-dropdown-target]')).map(initiator => ({initiator, target: document.querySelector(initiator.getAttribute('data-dropdown-target'))}));
  
  /** @type {Element | null} */
  var activeTarget = null;

  function ancestorMatchesSelector(node, selector) {
    let parent = node;
    if (!parent) return false;
    while (parent) {
      if (parent.matches(selector)) return parent;
      parent = parent.parentElement;
    }
    return false;
  }

  document.addEventListener('click', ({target}) => {
    if (target instanceof Element) {
      if (activeTarget) {
        if (!activeTarget.contains(target) && !target.hasAttribute('data-dropdown-target')) {
          activeTarget.style.display = 'none';
          activeTarget = null;
          return;
        }
      }
      
      target = ancestorMatchesSelector(target, '[data-dropdown-target]');
      if (target) {
        const dropdown = document.querySelector(target.getAttribute('data-dropdown-target'));
        
        if (dropdown) {
          if (dropdown === activeTarget) {
            dropdown.style.display = 'none';
            activeTarget = null;
          } else {
            dropdown.style.display = 'flex';
            activeTarget = dropdown;
          }
        }
      }
    }
  })
});