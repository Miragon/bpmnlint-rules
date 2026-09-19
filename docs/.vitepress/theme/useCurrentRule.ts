import { computed } from 'vue';
import { useData } from 'vitepress';

import { data } from './rules.data';

export function useCurrentRule() {
  const { page } = useData();
  return computed(() => {
    const ruleName = /^rules\/([a-z-]+)\.md$/.exec(page.value.relativePath)?.[1];
    return data.rules.find((rule) => rule.name === ruleName);
  });
}
