export function sceneryMarkup({ sun = true, flowers = true } = {}) {
  return `
    <div class="scenery" aria-hidden="true">
      <div class="sky"></div>
      ${sun ? '<div class="sun"></div>' : ''}
      <div class="cloud cloud-a"></div>
      <div class="cloud cloud-b"></div>
      <div class="cloud cloud-c"></div>
      <div class="cloud cloud-d"></div>
      <div class="cloud cloud-e"></div>
      <div class="hill hill-far"></div>
      <div class="hill hill-left"></div>
      <div class="hill hill-mid"></div>
      <div class="hill hill-right"></div>
      ${
        flowers
          ? `<div class="flower-row">
              <span class="flower f-pink"></span>
              <span class="flower f-yellow"></span>
              <span class="flower f-blue"></span>
              <span class="flower f-red"></span>
              <span class="flower f-yellow"></span>
              <span class="flower f-pink"></span>
              <span class="flower f-purple"></span>
              <span class="flower f-blue"></span>
            </div>`
          : ''
      }
    </div>
  `;
}
