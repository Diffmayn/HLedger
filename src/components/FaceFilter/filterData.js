const define = (filter) => ({
  opacity: 1,
  morph: false,
  thumbnail: filter.src,
  ...filter
})

export const FILTERS = [
  // ── Hats / headwear ────────────────────────────────────────────────────────
  define({ id: 'gold-crown',      name: 'Gold Crown',      category: 'hats',        type: 'hat',                     opacity: 0.94, src: '/filters/hats/gold-crown.png' }),
  define({ id: 'green-carnival',  name: 'Green Carnival',  category: 'hats',        type: 'hat',                     opacity: 0.94, src: '/filters/hats/green-carnival.png' }),
  define({ id: 'cat-ears',        name: 'Cat Ears',        category: 'hats',        type: 'hat',                     opacity: 0.96, src: '/filters/hats/cat-ears.png' }),
  define({ id: 'dog-ears',        name: 'Dog Ears',        category: 'hats',        type: 'hat',                     opacity: 0.96, src: '/filters/hats/dog-ears.png' }),
  define({ id: 'flower-crown',    name: 'Flower Crown',    category: 'hats',        type: 'hat',                     opacity: 0.96, src: '/filters/accessories/flower-crown.png' }),
  define({ id: 'flower-crown-hq', name: 'Flower Crown HD', category: 'hats',       type: 'hat',                     opacity: 0.98, src: '/filters/accessories/flower-crown-hq.png' }),

  // ── Accessories ────────────────────────────────────────────────────────────
  define({ id: 'cat-nose',        name: 'Cat Nose',        category: 'accessories', type: 'nose',                    opacity: 0.96, src: '/filters/accessories/cat-nose.png' }),
  define({ id: 'dog-nose',        name: 'Dog Nose',        category: 'accessories', type: 'nose',                    opacity: 0.96, src: '/filters/accessories/dog-nose.png' }),
  define({ id: 'dog-tongue',      name: 'Dog Tongue',      category: 'accessories', type: 'mouth',                   opacity: 0.96, src: '/filters/accessories/dog-tongue.gif' }),
  define({ id: 'party-horn',      name: 'Party Horn',      category: 'accessories', type: 'mouth',                                  src: '/filters/accessories/party-horn.png' }),
  define({ id: 'bow-tie',         name: 'Bow Tie',         category: 'accessories', type: 'moustache',                              src: '/filters/accessories/bow-tie.png' }),

  // ── Face masks ─────────────────────────────────────────────────────────────
  define({ id: 'anime-mask',      name: 'Anime',           category: 'faces',       type: 'face',                    opacity: 0.95, src: '/filters/faces/anime-mask.png' }),
  define({ id: 'anonymous-mask',  name: 'Anonymous',       category: 'faces',       type: 'face',                    opacity: 0.97, src: '/filters/faces/anonymous-mask.png' }),
  define({ id: 'jason-joker-mask',name: 'Jason Joker',     category: 'faces',       type: 'face',                    opacity: 0.97, src: '/filters/faces/jason-joker-mask.png' }),
]
