import { getPermalink } from './utils/permalinks';

export const headerData = {
  links: [
    { text: 'About', href: getPermalink('/about') },
    { text: 'Services', href: getPermalink('/services') },
    { text: 'Contact', href: getPermalink('/contact') },
  ],
  actions: [{ text: 'Contact us', href: getPermalink('/contact') }],
};

export const footerData = {
  links: [
    {
      title: 'Company',
      links: [
        { text: 'About', href: getPermalink('/about') },
        { text: 'Services', href: getPermalink('/services') },
        { text: 'Contact', href: getPermalink('/contact') },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],
  socialLinks: [],
  footNote: '',
};
