/**
 * Recovers a course's navigation from its legacy `menu.htm`.
 *
 * Each course folder is a two-frame page: `menu.htm` on top, content below.
 * The menu bar carries two things worth keeping.
 *
 * 1. The ten-tab site navigation, identical in every folder. The tab labels
 *    live in the images (`MEN.jpg` and friends) and are hard-coded in
 *    src/lib/tabs.ts, because the filenames do not match their destinations.
 *
 * 2. For most courses, a row of `<select>` dropdowns listing every lesson.
 *    This is the part worth parsing: each dropdown is a group, its first
 *    option is the group's own label, and the remaining options name the
 *    lessons in the order a student saw them. Those labels are hand-written
 *    ("[ 001번 - 050번 ]", "[ 제 1 단계 ]", "[ 7과 영어 ]") and carry intent
 *    that filenames do not, so they are preserved verbatim.
 *
 * Three courses (basics, middle, adults) have no dropdowns — their menu is the
 * tab bar alone — so they yield no groups and the app falls back to ordering
 * lessons by unit.
 */

import * as cheerio from "cheerio";

/**
 * @returns {{ groups: {label: string, lessons: string[]}[],
 *             labels: Record<string, string>,
 *             crossLinks: string[] }}
 */
export function parseLegacyMenu(html) {
  const $ = cheerio.load(html);
  const groups = [];
  const labels = {};

  $("select").each((_, sel) => {
    const options = $(sel)
      .find("option")
      .toArray()
      .map((o) => ({
        value: ($(o).attr("value") ?? "").trim(),
        text: $(o).text().replace(/ /g, " ").replace(/\s+/g, " ").trim(),
      }));
    if (options.length === 0) return;

    // The first option is the group's own heading and points at the course
    // cover rather than a lesson; everything after it is a lesson.
    const [head, ...rest] = options;
    const lessons = [];
    for (const opt of rest) {
      if (!opt.value || !/\.html?$/i.test(opt.value)) continue;
      const id = opt.value.replace(/\.html?$/i, "");
      if (/^(index|menu|cover|under)$/i.test(id)) continue;
      lessons.push(id);
      if (opt.text) labels[id] = opt.text;
    }
    if (lessons.length === 0) return;

    groups.push({
      label: head.text || `Group ${groups.length + 1}`,
      lessons,
    });
  });

  // Cross-course links, kept so the coverage audit can prove every legacy
  // destination has a home in the new app.
  const crossLinks = [];
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    if (href && !crossLinks.includes(href)) crossLinks.push(href);
  });

  return { groups, labels, crossLinks };
}
