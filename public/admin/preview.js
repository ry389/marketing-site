(function () {
  const cms = window.CMS;
  const h = window.h || (window.React && window.React.createElement);

  if (!cms || !h) return;

  const fallback = (value, text) => value || text;
  const getData = (entry) => entry.get('data').toJS();
  const textNode = (value) => (value ? String(value) : '');

  const Header = () =>
    h(
      'header',
      { className: 'cs-preview-header' },
      h(
        'div',
        { className: 'cs-preview-brand' },
        h('span', { className: 'cs-preview-mark' }, 'C', h('span', null, 'S')),
        h('span', null, 'Cited Stories')
      ),
      h('nav', { className: 'cs-preview-nav' }, h('span', null, 'Case Studies'), h('span', null, 'Research'))
    );

  const Field = ({ label, value, muted }) =>
    h('div', null, h('dt', null, label), h('dd', { className: muted ? 'cs-preview-muted' : undefined }, textNode(value)));

  const Body = ({ widgetFor }) => {
    const body = widgetFor('body');
    return body ? h('div', { className: 'cs-preview-body' }, body) : null;
  };

  const CaseStudyPreview = ({ entry, widgetFor }) => {
    const data = getData(entry);

    return h(
      'div',
      { className: 'cs-preview' },
      h(Header),
      h(
        'section',
        { className: 'cs-preview-container' },
        h(
          'div',
          { className: 'cs-preview-hero' },
          h(
            'div',
            null,
            h('p', { className: 'cs-preview-eyebrow' }, fallback(data.client, 'Client')),
            h('h1', null, fallback(data.title, 'Case study title')),
            h('p', { className: 'cs-preview-subtitle' }, fallback(data.subtitle, 'Case study subtitle'))
          ),
          h(
            'aside',
            { className: 'cs-preview-card' },
            h(
              'dl',
              null,
              h(Field, { label: 'Client', value: fallback(data.client, 'Client name') }),
              h(Field, { label: 'Campaign type', value: fallback(data.campaignType, 'Campaign type') }),
              h(Field, { label: 'Outcome', value: fallback(data.outcome, 'Outcome summary'), muted: true })
            )
          )
        )
      ),
      h(
        'section',
        { className: 'cs-preview-project-section' },
        h('div', { className: 'cs-preview-container cs-preview-project' },
          h('p', { className: 'cs-preview-eyebrow' }, 'Project'),
          h(
            'div',
            null,
            h('p', { className: 'cs-preview-project-text' }, fallback(data.project, 'Project summary')),
            h(Body, { widgetFor })
          )
        )
      ),
      h(
        'section',
        { className: 'cs-preview-cta' },
        h(
          'div',
          { className: 'cs-preview-container' },
          h('div', null, h('p', { className: 'cs-preview-eyebrow' }, 'Start here'), h('h2', null, 'Ready to get cited?')),
          h('span', { className: 'cs-preview-button' }, 'Book a discovery call')
        )
      )
    );
  };

  const PostPreview = ({ entry, widgetFor }) => {
    const data = getData(entry);

    return h(
      'div',
      { className: 'cs-preview' },
      h(Header),
      h(
        'article',
        { className: 'cs-preview-container cs-preview-post' },
        h('p', { className: 'cs-preview-eyebrow' }, fallback(data.category, 'Research')),
        h('h1', null, fallback(data.title, 'Post title')),
        data.excerpt ? h('p', { className: 'cs-preview-subtitle' }, data.excerpt) : null,
        h(Body, { widgetFor })
      )
    );
  };

  cms.registerPreviewStyle('/admin/preview.css');
  cms.registerPreviewTemplate('caseStudy', CaseStudyPreview);
  cms.registerPreviewTemplate('post', PostPreview);
})();
