# Waffle Whisk

A scroll-driven website for Waffle Whisk, a breakfast spot on MM Alam Road, Gulberg III, Lahore.

**Live site:** https://waffle-whisk-psi.vercel.app

## What it does

- **Scroll film hero.** On laptops and desktops, a hero video of maple syrup pouring onto a waffle plays forward as you scroll down and backward as you scroll up. Captions appear on sticker cards along the way. Phones, tablets in portrait and reduced-motion visitors get a still image instead, and never download the video.
- **Live open or closed status** in the header and footer, based on Lahore time.
- **Menu** with Waffles, Pancakes, Savory and Drinks tabs (keyboard friendly).
- **Deals and events**, with today's deal marked automatically, plus a "hold to pour" secret deal.
- **Book a table or join the waitlist.** The form checks your details, then opens WhatsApp with the booking typed out.
- **Find us** section with hours (today highlighted), directions and an embedded map.

## Built with

Plain HTML, CSS and JavaScript. No framework, no build step.

```
index.html
assets/css/site.css
assets/js/site.js
assets/video/hero-scrub.mp4
assets/img/
```

Fonts: Bagel Fat One, Figtree and DM Mono (Google Fonts).

## Run it locally

Any static server works, for example:

```
npx http-server .
```

Then open the address it prints. Opening `index.html` directly also works, but shows the still hero instead of the scroll video, because browsers block video loading from local files.

## Placeholder content

This is a demo build. The address, phone and WhatsApp number (`923000000000`), prices, deals, event date and opening hours are placeholders. The number and hours live in the `CONFIG` block at the top of `assets/js/site.js`.

## Credits

- Hero video generated with Higgsfield (Veo 3.1 Lite).
- Placeholder photos from Unsplash, by Carter Saunders, VD Photography, Dyah Arum, nikldn, Tyke Jones, Nathan Dumlao, Joyful and Fernando Andrade.
- Icons drawn in the Lucide style.
