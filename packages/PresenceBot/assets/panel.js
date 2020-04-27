window.addEventListener('DOMContentLoaded', () => {
  const generator = document.getElementById('generate-token');
  const holder = document.getElementById('token-holder');

  let generating = false;
  generator.addEventListener('click', async () => {
    if (generating) return;
    generating = true;
    const { key } = await (await fetch('/panel/api/apikey')).json();
    holder.innerText = key;
    generating = false;
  });

  const linkCodeGenerator = document.getElementById('generate-link-code');
  const linkCodeHolder = document.getElementById('link-code-holder');

  let linkCodeGenerating = false;
  linkCodeGenerator.addEventListener('click', async () => {
    if (linkCodeGenerating) return;
    linkCodeGenerating = true;
    const { code } = await fetch('/panel/api/linkcode').then(r => r.json());
    linkCodeHolder.innerText = code;
    linkCodeGenerating = false;
  });

  /**
   * @type {HTMLIFrameElement}
   */
  const preview = document.getElementById('preview-frame');

  iFrameResize({
    sizeHeight: true,
    sizeWidth: true,
    widthCalculationMethod: 'rightMostElement'
  }, preview);

  const styleInjection = document.querySelector("link#presenti-injection");
  const newStyle = document.createElement("link");
  newStyle.rel = "stylesheet";
  newStyle.href = styleInjection.href;

  preview.onload = function() {
    preview.contentDocument.body.appendChild(newStyle);
  }
});