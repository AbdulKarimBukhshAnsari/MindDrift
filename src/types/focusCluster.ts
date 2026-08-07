/** Named focus work cluster — domains allowed during a focus session. */
export type FocusCluster = {
  id: string;
  name: string;
  /** User domains (google.com is pinned separately at apply time). */
  domains: string[];
  createdAt: number;
};
