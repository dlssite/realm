export interface SearchTask {
  id: string;
  title: string;
  identifier: string;
  status: string;
}

export interface SearchProject {
  id: string;
  name: string;
  identifier: string;
  status: string;
}

export interface SearchWikiPage {
  id: string;
  title: string;
  slug: string;
}

export interface SearchResults {
  tasks: SearchTask[];
  projects: SearchProject[];
  wikiPages: SearchWikiPage[];
}
