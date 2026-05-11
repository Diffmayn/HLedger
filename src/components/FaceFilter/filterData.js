const define = (filter) => ({
  opacity: 1,
  morph: false,
  thumbnail: filter.src,
  fitScale: 1,
  offsetXRatio: 0,
  offsetYRatio: 0,
  rotationOffset: 0,
  ...filter
})

export const FILTERS = [
  // ── Hats / headwear ────────────────────────────────────────────────────────
  define({ id: 'top-hat',         name: 'Top Hat',         category: 'hats',        type: 'hat',    opacity: 0.95, fitScale: 0.94, offsetYRatio: -0.08, src: '/filters/hats/top-hat.png' }),
  define({ id: 'birthday-hat',    name: 'Birthday Hat',    category: 'hats',        type: 'hat',    opacity: 0.95, fitScale: 0.84, offsetYRatio: -0.12, src: '/filters/hats/birthday-hat.png' }),
  define({ id: 'party-hat',       name: 'Party Hat',       category: 'hats',        type: 'hat',    opacity: 0.95, fitScale: 0.82, offsetYRatio: -0.13, src: '/filters/hats/party-hat.png' }),
  define({ id: 'cowboy-hat',      name: 'Cowboy Hat',      category: 'hats',        type: 'hat',    opacity: 0.95, fitScale: 1.08, offsetYRatio: -0.02, src: '/filters/hats/cowboy-hat.png' }),
  define({ id: 'wizard-hat',      name: 'Wizard Hat',      category: 'hats',        type: 'hat',    opacity: 0.95, fitScale: 0.98, offsetYRatio: -0.18, src: '/filters/hats/wizard-hat.png' }),
  define({ id: 'beret',           name: 'Beret',           category: 'hats',        type: 'hat',    opacity: 0.95, fitScale: 0.8, offsetXRatio: -0.06, offsetYRatio: -0.03, rotationOffset: -6, src: '/filters/hats/beret.png' }),
  define({ id: 'gold-crown',      name: 'Gold Crown',      category: 'hats',        type: 'hat',    opacity: 0.94, fitScale: 0.92, offsetYRatio: -0.07, src: '/filters/hats/gold-crown.png' }),
  define({ id: 'green-carnival',  name: 'Green Carnival',  category: 'hats',        type: 'hat',    opacity: 0.94, fitScale: 0.98, offsetYRatio: -0.08, src: '/filters/hats/green-carnival.png' }),
  define({ id: 'cat-ears',        name: 'Cat Ears',        category: 'hats',        type: 'hat',    opacity: 0.96, fitScale: 0.94, offsetYRatio: -0.06, src: '/filters/hats/cat-ears.png' }),
  define({ id: 'dog-ears',        name: 'Dog Ears',        category: 'hats',        type: 'hat',    opacity: 0.96, fitScale: 0.96, offsetYRatio: -0.04, src: '/filters/hats/dog-ears.png' }),
  define({ id: 'banana-hat',      name: 'Banana Hat',      category: 'hats',        type: 'hat',    opacity: 0.95, fitScale: 0.9, offsetYRatio: -0.1, src: '/filters/hats/banana-hat.png' }),
  define({ id: 'visor',           name: 'Visor',           category: 'hats',        type: 'hat',    opacity: 0.95, fitScale: 0.86, offsetYRatio: 0.08, src: '/filters/hats/visor.png' }),
  define({ id: 'flower-crown',    name: 'Flower Crown',    category: 'hats',        type: 'hat',    opacity: 0.96, fitScale: 1.08, offsetYRatio: -0.05, src: '/filters/accessories/flower-crown.png' }),
  define({ id: 'flower-crown-hq', name: 'Flower Crown HD', category: 'hats',        type: 'hat',    opacity: 0.98, fitScale: 1.08, offsetYRatio: -0.05, src: '/filters/accessories/flower-crown-hq.png' }),

  // ── Accessories ────────────────────────────────────────────────────────────
  define({ id: 'cat-nose',        name: 'Cat Nose',        category: 'accessories', type: 'nose',                    opacity: 0.96, src: '/filters/accessories/cat-nose.png' }),
  define({ id: 'dog-nose',        name: 'Dog Nose',        category: 'accessories', type: 'nose',                    opacity: 0.96, src: '/filters/accessories/dog-nose.png' }),
  define({ id: 'dog-tongue',      name: 'Dog Tongue',      category: 'accessories', type: 'mouth',                   opacity: 0.96, src: '/filters/accessories/dog-tongue.gif' }),
  define({ id: 'party-horn',      name: 'Party Horn',      category: 'accessories', type: 'mouth',                   fitScale: 1.12, offsetYRatio: 0.04, src: '/filters/accessories/party-horn.png' }),
  define({ id: 'bow-tie',         name: 'Bow Tie',         category: 'accessories', type: 'body',                    opacity: 0.96, fitScale: 0.94, offsetYRatio: 0.1, src: '/filters/accessories/bow-tie.png' }),

  // ── Glasses ────────────────────────────────────────────────────────────────
  define({ id: 'classic-glasses', name: 'Classic',         category: 'glasses',    type: 'glasses', opacity: 0.96, fitScale: 0.98, src: '/filters/glasses/classic-glasses.png' }),
  define({ id: 'aviator',         name: 'Aviator',         category: 'glasses',    type: 'glasses', opacity: 0.96, fitScale: 1.04, offsetYRatio: 0.02, src: '/filters/glasses/aviator.png' }),
  define({ id: 'pixel-glasses',   name: 'Pixel',           category: 'glasses',    type: 'glasses', opacity: 0.96, fitScale: 1.02, offsetYRatio: -0.01, src: '/filters/glasses/pixel-glasses.png' }),
  define({ id: 'heart-glasses',   name: 'Heart',           category: 'glasses',    type: 'glasses', opacity: 0.96, fitScale: 0.94, offsetYRatio: -0.02, src: '/filters/glasses/heart-glasses.png' }),
  define({ id: 'star-glasses',    name: 'Star',            category: 'glasses',    type: 'glasses', opacity: 0.96, fitScale: 0.98, src: '/filters/glasses/star-glasses.png' }),
  define({ id: 'steampunk',       name: 'Steampunk',       category: 'glasses',    type: 'glasses', opacity: 0.96, fitScale: 1.08, offsetYRatio: 0.01, src: '/filters/glasses/steampunk.png' }),
  define({ id: 'cat-eye',         name: 'Cat Eye',         category: 'glasses',    type: 'glasses', opacity: 0.96, fitScale: 0.94, offsetYRatio: -0.04, src: '/filters/glasses/cat-eye.png' }),

  // ── Moustaches / beards ───────────────────────────────────────────────────
  define({ id: 'classic-mustache',name: 'Classic',         category: 'moustaches', type: 'moustache', opacity: 0.96, fitScale: 0.94, src: '/filters/moustaches/classic-mustache.png' }),
  define({ id: 'handlebar',       name: 'Handlebar',       category: 'moustaches', type: 'moustache', opacity: 0.96, fitScale: 1.02, offsetYRatio: 0.01, src: '/filters/moustaches/handlebar.png' }),
  define({ id: 'curly',           name: 'Curly',           category: 'moustaches', type: 'moustache', opacity: 0.96, fitScale: 0.98, src: '/filters/moustaches/curly.png' }),
  define({ id: 'goatee',          name: 'Goatee',          category: 'moustaches', type: 'moustache', opacity: 0.96, fitScale: 0.88, offsetYRatio: 0.24, src: '/filters/moustaches/goatee.png' }),
  define({ id: 'walrus',          name: 'Walrus',          category: 'moustaches', type: 'moustache', opacity: 0.96, fitScale: 1.1, offsetYRatio: 0.03, src: '/filters/moustaches/walrus.png' }),

  // ── Face masks ─────────────────────────────────────────────────────────────
  define({ id: 'anime-mask',      name: 'Anime',           category: 'faces',       type: 'face', opacity: 0.95, fitScale: 0.98, offsetYRatio: 0.02, src: '/filters/faces/anime-mask.png' }),
  define({ id: 'anonymous-mask',  name: 'Anonymous',       category: 'faces',       type: 'face', opacity: 0.97, fitScale: 0.96, offsetYRatio: 0.02, src: '/filters/faces/anonymous-mask.png' }),
  define({ id: 'jason-joker-mask',name: 'Jason Joker',     category: 'faces',       type: 'face', opacity: 0.97, fitScale: 1.02, offsetYRatio: 0.04, src: '/filters/faces/jason-joker-mask.png' }),
  define({ id: 'front-man-mask',  name: 'Front Man',       category: 'faces',       type: 'face', opacity: 0.97, fitScale: 0.98, offsetYRatio: 0.03, src: '/filters/faces/squid-front-man-mask.png' }),
  define({ id: 'guard-mask',      name: 'Guard',           category: 'faces',       type: 'face', opacity: 0.97, fitScale: 0.98, offsetYRatio: 0.03, src: '/filters/faces/squid-guard-mask.png' }),
  define({ id: 'classic-mask',    name: 'Classic Mask',    category: 'faces',       type: 'face', opacity: 0.95, fitScale: 1.01, offsetYRatio: 0.04, src: '/filters/faces/mask.png' }),
]
