declare const Reveal: any;

function initRevealMenu(): void {
  const menuButton =
    document.getElementById('slide-menu-button');

  const menu =
    document.getElementById('slide-menu');

  const menuItems =
    document.getElementById('slide-menu-items');

  if (!menuButton || !menu || !menuItems) {
    console.error('Reveal menu elements not found');
    return;
  }

  function getSlideTitle(
    slide: HTMLElement,
    index: number
  ): string {
    const heading =
      slide.querySelector('h1, h2, h3');

    return (
      heading?.textContent?.trim() ||
      `Slide ${index + 1}`
    );
  }

  function closeMenu(): void {
    menu!.classList.remove('open');
  }

  function toggleMenu(): void {
    menu!.classList.toggle('open');
  }

  function buildMenu(): void {
    const slides =
      Reveal.getSlides() as HTMLElement[];

    menuItems!.innerHTML = '';

    slides.forEach((slide, index) => {
      const indices =
        Reveal.getIndices(slide);

      const button =
        document.createElement('button');

      button.className =
        'slide-menu-item';

    button.textContent =
    getSlideTitle(slide, index);

      button.addEventListener(
        'click',
        () => {
          Reveal.slide(
            indices.h,
            indices.v
          );

          closeMenu();
        }
      );

      menuItems!.appendChild(button);
    });
  }

  menuButton.addEventListener(
    'click',
    event => {
      event.stopPropagation();
      toggleMenu();
    }
  );

  document.addEventListener(
    'click',
    event => {
      const target =
        event.target as Node;

      if (
        menu.classList.contains('open') &&
        !menu.contains(target) &&
        !menuButton.contains(target)
      ) {
        closeMenu();
      }
    }
  );

  document.addEventListener(
    'keydown',
    event => {
      if (
        event.key === 'm' ||
        event.key === 'M'
      ) {
        event.preventDefault();
        toggleMenu();
      }

      if (event.key === 'Escape') {
        closeMenu();
      }
    }
  );

  if (Reveal.isReady()) {
    buildMenu();
  } else {
    Reveal.on('ready', buildMenu);
  }
}

initRevealMenu();