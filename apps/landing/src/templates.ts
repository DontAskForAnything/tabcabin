import { type TemplateId, TEMPLATES } from '@tabcabin/core'

/**
 * What the website says about each template (the boards themselves come from @tabcabin/core, the
 * same as in the extension). `title` is the page heading, `searchTitle` the title in search
 * results, written with the words people search for.
 */
interface TemplatePage {
  title: string
  searchTitle: string
  guide: [string, string]
  tip: string
}

const PAGES: Record<TemplateId, TemplatePage> = {
  work: {
    title: 'A work board',
    searchTitle: 'Work tab organizer: projects, meetings, reading',
    guide: [
      'Most work tabs belong to a project, a meeting or a pile of things to read. Give each its own group and the new tab page becomes the place you start the day: the doc you were writing, the call in ten minutes, the article a colleague sent.',
      'When a project is done, move its group to another category or delete it. Deleted groups wait in the bin, so cleaning up costs nothing.',
    ],
    tip: 'Drag the meeting link to the top of its group before the call starts.',
  },
  home: {
    title: 'A home board',
    searchTitle: 'Home organizer board: recipes, shopping, trips',
    guide: [
      'Shopping lists, recipes you want to try and trips you are planning tend to live in a dozen tabs on the family computer. A board keeps them in one place, with a note next to each link.',
      'End a note with /todo and it becomes a checkbox, which makes the shopping group a list you can tick off in the shop.',
    ],
    tip: 'Add a note to each recipe with what you changed and whether it worked.',
  },
  study: {
    title: 'A study board',
    searchTitle: 'Study planner for students: courses and readings',
    guide: [
      'A course is a syllabus, slides, readings and your own notes, spread over a learning platform, a library and a drive. Group them by course and reading, and write the summary next to the source.',
      'Reminders bring a reading back on the day you planned to do it, as a notification and a badge on the toolbar.',
    ],
    tip: 'Set a reminder on whatever you need to read by Friday.',
  },
  project: {
    title: 'A side project board',
    searchTitle: 'Side project planning board: ideas and tasks',
    guide: [
      'Side projects happen in short evenings. A board with ideas, the next small task and the docs you keep reopening lets you pick up where you left off, without re-opening twenty tabs first.',
      'Write ideas down the moment they come and sort them later. The to-do group stays short on purpose: one small thing for this week is enough.',
    ],
    tip: 'Keep the repository, the issue tracker and the docs in one group.',
  },
  'job-hunt': {
    title: 'A job hunt board',
    searchTitle: 'Job search tracker template for your new tab',
    guide: [
      'A job hunt is mostly tabs: postings, company pages, the form you have not finished. Drag each posting from the tabs panel into “To apply” and close it. Nothing is lost, and the tab bar stays short.',
      'When you send an application, move the link to “Applied” and add the date in its note. A reminder a week later tells you when to follow up. Before an interview, keep the company page, your notes and a short checklist in one group.',
    ],
    tip: 'Set a weekly reminder on “Applied” to follow up on every application at once.',
  },
  thesis: {
    title: 'A thesis board',
    searchTitle: 'Thesis research organizer: sources and chapters',
    guide: [
      'A thesis collects sources for months. Save each paper or book page to “Sources” with the quote and the page number in its note, and the references at the end write themselves.',
      'Chapters work well as to-dos you tick off as drafts are finished, and the supervisor group keeps their comments in their own words, next to the chapter they are about.',
    ],
    tip: 'Search finds a quote by any word in its note, across every workspace.',
  },
  trip: {
    title: 'A trip planning board',
    searchTitle: 'Trip planning board: stays, tickets, packing',
    guide: [
      'Planning a trip means comparing stays, booking tickets and collecting places to see, usually in thirty tabs. Save two or three stays side by side, keep the booking confirmations in one group and the map links in another.',
      'The packing list is a set of to-dos you can tick off the evening before, on the same board as everything else.',
    ],
    tip: 'Sign in on a second computer and the board is there too, with every change.',
  },
  moving: {
    title: 'A moving house board',
    searchTitle: 'Moving checklist: viewings, the move, paperwork',
    guide: [
      'Moving house is a flat hunt, a move and a pile of paperwork at the same time. Keep each viewing as a link with a note on what you liked, written right after you saw it.',
      'The paperwork group is a checklist: new address, internet, bills. Tick it off as you go, and nothing waits for the last day.',
    ],
    tip: 'Add a reminder to each viewing so it shows up on the day.',
  },
  gifts: {
    title: 'A gift list board',
    searchTitle: 'Christmas gift list template with a budget',
    guide: [
      'Gift ideas come at random moments, months before you need them. Save the link with a note on who it is for, and drag it to “Bought” once it is ordered.',
      'A budget note at the top keeps the total in sight while you look.',
    ],
    tip: 'Use a note colour per person to see at a glance who still needs something.',
  },
  weekly: {
    title: 'A weekly reset board',
    searchTitle: 'Weekly planning template: a weekly reset board',
    guide: [
      'A short weekly review keeps the tabs from piling up again. Three things that matter this week, a list of who owes you a reply, and a reading pile you clear every Friday.',
      'Anything that is still open on Friday either moves to next week or goes. The bin keeps it in case you change your mind.',
    ],
    tip: 'Set a weekly reminder for Friday afternoon to clear the reading pile.',
  },
}

/** Every template with its page text, in the extension's order. */
export const templatePages = TEMPLATES.map((template) => ({
  template,
  page: PAGES[template.id],
}))
