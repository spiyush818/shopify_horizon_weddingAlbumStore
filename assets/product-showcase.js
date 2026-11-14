const wishlistStorageKey = 'horizon-wishlist';

/** @returns {Set<string> | null} */
function readWishlist() {
  try {
    const storedValue = window.localStorage.getItem(wishlistStorageKey);
    if (!storedValue) return new Set();

    const productIds = JSON.parse(storedValue);
    if (!Array.isArray(productIds)) {
      throw new TypeError('Saved wishlist data is not a product ID list.');
    }

    return new Set(productIds.map(String));
  } catch (error) {
    console.error('Could not read the saved product wishlist.', error);
    return null;
  }
}

/**
 * @param {HTMLButtonElement} button
 * @param {Set<string>} wishlist
 */
function updateWishlistButton(button, wishlist) {
  const productId = button.dataset.wishlistProduct;
  const productTitle = button.dataset.productTitle;
  if (!productId || !productTitle) return;

  const isSaved = wishlist.has(productId);

  button.setAttribute('aria-pressed', String(isSaved));
  button.setAttribute(
    'aria-label',
    `${isSaved ? 'Remove' : 'Add'} ${productTitle} ${isSaved ? 'from' : 'to'} wishlist`
  );
}

/** @param {HTMLElement} showcase */
function updateShowcaseControls(showcase) {
  const track = showcase.querySelector('[data-showcase-track]');
  if (!(track instanceof HTMLElement)) return;

  const maxScroll = track.scrollWidth - track.clientWidth;
  const previousButton = showcase.querySelector('[data-showcase-scroll="-1"]');
  const nextButton = showcase.querySelector('[data-showcase-scroll="1"]');

  if (previousButton instanceof HTMLButtonElement) previousButton.disabled = track.scrollLeft <= 1;
  if (nextButton instanceof HTMLButtonElement) {
    nextButton.disabled = maxScroll <= 1 || track.scrollLeft >= maxScroll - 1;
  }
}

/** @param {ParentNode} [root] */
function initializeShowcases(root = document) {
  const wishlist = readWishlist();

  root.querySelectorAll('[data-wishlist-product]').forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;

    if (wishlist) {
      updateWishlistButton(button, wishlist);
    } else {
      button.disabled = true;
      button.setAttribute('aria-label', 'Wishlist is unavailable in this browser');
    }
  });

  root.querySelectorAll('[data-product-showcase]').forEach((showcase) => {
    if (!(showcase instanceof HTMLElement)) return;

    const track = showcase.querySelector('[data-showcase-track]');
    if (!(track instanceof HTMLElement) || track.dataset.controlsInitialized === 'true') return;

    track.dataset.controlsInitialized = 'true';
    track.addEventListener('scroll', () => updateShowcaseControls(showcase), { passive: true });
    updateShowcaseControls(showcase);
  });
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;

  const wishlistButton = event.target.closest('[data-wishlist-product]');
  if (!(wishlistButton instanceof HTMLButtonElement)) {
    const scrollButton = event.target.closest('[data-showcase-scroll]');
    if (!(scrollButton instanceof HTMLButtonElement)) return;

    const showcase = scrollButton.closest('[data-product-showcase]');
    const track = showcase?.querySelector('[data-showcase-track]');
    const direction = Number(scrollButton.dataset.showcaseScroll);
    if (!(track instanceof HTMLElement) || !Number.isFinite(direction)) return;

    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: 'smooth',
    });
    return;
  }

  if (wishlistButton && !wishlistButton.disabled) {
    const wishlist = readWishlist();
    if (!wishlist) {
      wishlistButton.disabled = true;
      wishlistButton.setAttribute('aria-label', 'Wishlist is unavailable in this browser');
      return;
    }

    const productId = wishlistButton.dataset.wishlistProduct;
    if (!productId) return;

    if (wishlist.has(productId)) {
      wishlist.delete(productId);
    } else {
      wishlist.add(productId);
    }

    try {
      window.localStorage.setItem(wishlistStorageKey, JSON.stringify([...wishlist]));
    } catch (error) {
      console.error('Could not save the product wishlist.', error);
      wishlistButton.disabled = true;
      wishlistButton.setAttribute('aria-label', 'Wishlist is unavailable in this browser');
      return;
    }

    document.querySelectorAll('[data-wishlist-product]').forEach((button) => {
      if (button instanceof HTMLButtonElement) updateWishlistButton(button, wishlist);
    });
    document.dispatchEvent(
      new CustomEvent('horizon:wishlist:change', {
        detail: { productId, saved: wishlist.has(productId) },
      })
    );
    return;
  }
});

document.addEventListener('shopify:section:load', (event) => {
  if (event.target instanceof Element) initializeShowcases(event.target);
});

window.addEventListener('resize', () => {
  document.querySelectorAll('[data-product-showcase]').forEach((showcase) => {
    if (showcase instanceof HTMLElement) updateShowcaseControls(showcase);
  });
});

initializeShowcases();