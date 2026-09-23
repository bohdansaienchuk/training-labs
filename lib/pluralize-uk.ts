export type UkrainianPluralForms = {
  one: string;
  few: string;
  many: string;
};

const ukrainianPluralRules = new Intl.PluralRules("uk");

export function pluralizeUk(count: number, forms: UkrainianPluralForms): string {
  const category = ukrainianPluralRules.select(count);
  const noun = category === "one" ? forms.one : category === "few" ? forms.few : forms.many;
  return `${count} ${noun}`;
}
