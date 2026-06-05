import { getCollection, render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { CaseStudy } from '~/types';
import { cleanSlug, getPermalink } from './permalinks';

const CASE_STUDY_BASE = 'case-studies';

const getNormalizedCaseStudy = async (caseStudy: CollectionEntry<'caseStudy'>): Promise<CaseStudy> => {
  const { id, data } = caseStudy;
  const { Content } = await render(caseStudy);

  const {
    publishDate: rawPublishDate = new Date(),
    updateDate: rawUpdateDate,
    title,
    subtitle,
    client,
    campaignType,
    outcome,
    project,
    storyWeTold,
    excerpt,
    image,
    tags: rawTags = [],
    category: rawCategory,
    draft = false,
    metadata = {},
  } = data;

  const slug = cleanSlug(id);
  const publishDate = new Date(rawPublishDate);
  const updateDate = rawUpdateDate ? new Date(rawUpdateDate) : undefined;
  const category = rawCategory
    ? {
        slug: cleanSlug(rawCategory),
        title: rawCategory,
      }
    : undefined;
  const tags = rawTags.map((tag: string) => ({
    slug: cleanSlug(tag),
    title: tag,
  }));

  return {
    id,
    slug,
    permalink: getPermalink(`${CASE_STUDY_BASE}/${slug}`),
    publishDate,
    updateDate,
    title,
    subtitle,
    client,
    campaignType,
    outcome,
    project,
    storyWeTold,
    excerpt,
    image,
    category,
    tags,
    draft,
    metadata,
    Content,
  };
};

const load = async (): Promise<Array<CaseStudy>> => {
  const caseStudies = await getCollection('caseStudy');
  const normalizedCaseStudies = caseStudies.map(async (caseStudy) => await getNormalizedCaseStudy(caseStudy));

  return (await Promise.all(normalizedCaseStudies))
    .sort((a, b) => b.publishDate.valueOf() - a.publishDate.valueOf())
    .filter((caseStudy) => !caseStudy.draft);
};

let _caseStudies: Array<CaseStudy>;

export const fetchCaseStudies = async (): Promise<Array<CaseStudy>> => {
  if (!_caseStudies) {
    _caseStudies = await load();
  }

  return _caseStudies;
};

export const getStaticPathsCaseStudy = async () =>
  (await fetchCaseStudies()).map((caseStudy) => ({
    params: {
      slug: caseStudy.slug,
    },
    props: { caseStudy },
  }));
