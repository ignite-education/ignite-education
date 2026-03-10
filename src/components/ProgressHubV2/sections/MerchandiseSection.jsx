import React from 'react';

const PRODUCTS = [
  {
    src: 'https://auth.ignite.education/storage/v1/object/public/assets/15296564955925613761_2048.jpg.webp',
    alt: 'Tote bag',
    url: 'https://shop.ignite.education/products/tote-bag-1?variant=53677278495051',
  },
  {
    src: 'https://auth.ignite.education/storage/v1/object/public/assets/6000531078946675470_2048.jpg.webp',
    alt: 'Black Mug',
    url: 'https://shop.ignite.education/products/black-mug-11oz-15oz?variant=53677361889611',
  },
  {
    src: 'https://auth.ignite.education/storage/v1/object/public/assets/15764184527208086102_2048%20(1).jpg',
    alt: 'Notebook',
    url: 'https://shop.ignite.education/products/notebook?variant=53241113084235',
  },
  {
    src: 'https://auth.ignite.education/storage/v1/object/public/assets/14638277160201691379_2048.webp',
    alt: 'Quote Tote',
    url: 'https://shop.ignite.education/products/copy-of-empowering-quote-organic-cotton-tote-bag-eco-friendly-shopper-sustainable-gift-motivational-bag-reusable-grocery-tote-1?variant=53677328367947',
  },
  {
    src: 'https://auth.ignite.education/storage/v1/object/public/assets/13210320553437944029_2048.jpg.webp',
    alt: 'Sweatshirt',
    url: 'https://shop.ignite.education/products/unisex-heavy-blend™-crewneck-sweatshirt?variant=53677325254987',
  },
];

const MerchandiseSection = () => {
  return (
    <section className="bg-white px-12 pb-8" style={{ paddingTop: '45px' }}>
      <h2 className="text-black" style={{ fontSize: '2rem', fontWeight: 600, lineHeight: '1.2', letterSpacing: '-1%', marginBottom: '0.6rem' }}>Merchandise</h2>
      <p className="text-black font-light" style={{ fontSize: '17px', lineHeight: '1.6', letterSpacing: '-0.01em', marginBottom: '12px' }}>
        Discover official Ignite merchandise, with all profit supporting education and social mobility projects across the UK.
      </p>
      <div className="flex gap-3 overflow-hidden">
        {PRODUCTS.map((product) => (
          <img
            key={product.alt}
            src={product.src}
            alt={product.alt}
            className="flex-[1_0_0%] min-w-[200px] rounded transition-transform duration-200 hover:scale-[1.015] cursor-pointer"
            onClick={() => window.open(product.url, '_blank', 'noopener,noreferrer')}
          />
        ))}
      </div>
    </section>
  );
};

export default MerchandiseSection;
