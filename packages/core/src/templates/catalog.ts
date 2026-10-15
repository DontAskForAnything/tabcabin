import type { Template } from './types'

/**
 * Ready-made workspaces. Each group starts with a tip or a short checklist that people replace
 * with their own things; links only where one is worth having from the start.
 */
export const TEMPLATES: Template[] = [
  {
    id: 'work',
    emoji: '💼',
    name: { en: 'Work', pl: 'Praca' },
    summary: {
      en: 'Projects, meetings and things to read.',
      pl: 'Projekty, spotkania i rzeczy do przeczytania.',
    },
    featured: true,
    groups: [
      {
        emoji: '🗂️',
        title: { en: 'Projects', pl: 'Projekty' },
        items: [
          {
            note: {
              en: 'One link per project: the doc, the board, the repository.',
              pl: 'Jeden link na projekt: dokument, tablica, repozytorium.',
            },
          },
        ],
      },
      {
        emoji: '📅',
        title: { en: 'Meetings', pl: 'Spotkania' },
        items: [
          {
            note: {
              en: 'Keep the call link and the agenda here, next to each other.',
              pl: 'Trzymaj tu link do rozmowy i plan spotkania obok siebie.',
            },
          },
        ],
      },
      {
        emoji: '📚',
        title: { en: 'Read later', pl: 'Do przeczytania' },
        items: [
          {
            note: {
              en: 'Drag articles here from your tabs and close them.',
              pl: 'Przeciągaj tu artykuły z kart i zamykaj je.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'home',
    emoji: '🏠',
    name: { en: 'Home', pl: 'Dom' },
    summary: { en: 'Shopping, recipes and trips.', pl: 'Zakupy, przepisy i podróże.' },
    featured: true,
    groups: [
      {
        emoji: '🛒',
        title: { en: 'Shopping', pl: 'Zakupy' },
        items: [
          {
            note: {
              en: 'End a note with /todo to turn it into a shopping list item.',
              pl: 'Zakończ notatkę na /todo, a zrobi się z niej pozycja na liście zakupów.',
            },
          },
        ],
      },
      {
        emoji: '🍳',
        title: { en: 'Recipes', pl: 'Przepisy' },
        items: [
          {
            note: {
              en: 'Add a note to a recipe: what you changed and whether it worked.',
              pl: 'Dopisz do przepisu notatkę: co zmienić i czy wyszło.',
            },
          },
        ],
      },
      {
        emoji: '✈️',
        title: { en: 'Trips', pl: 'Podróże' },
        items: [
          {
            note: {
              en: 'One group per trip works well once the dates are set.',
              pl: 'Gdy daty są znane, dobrze działa osobna grupa na każdy wyjazd.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'study',
    emoji: '🎓',
    name: { en: 'Study', pl: 'Nauka' },
    summary: { en: 'Courses, notes and reading.', pl: 'Kursy, notatki i lektury.' },
    featured: true,
    groups: [
      {
        emoji: '📘',
        title: { en: 'Courses', pl: 'Kursy' },
        items: [
          {
            note: {
              en: 'Start with the course page and the syllabus.',
              pl: 'Zacznij od strony kursu i sylabusa.',
            },
          },
        ],
      },
      {
        emoji: '📝',
        title: { en: 'Notes', pl: 'Notatki' },
        items: [
          {
            todo: {
              en: "Sum up this week's lecture in three lines",
              pl: 'Streść wykład z tego tygodnia w trzech zdaniach',
            },
          },
        ],
      },
      {
        emoji: '📖',
        title: { en: 'Reading', pl: 'Lektury' },
        items: [
          {
            note: {
              en: 'Set a reminder on what you need to read by Friday.',
              pl: 'Ustaw przypomnienie na to, co trzeba przeczytać do piątku.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'project',
    emoji: '🛠️',
    name: { en: 'Side project', pl: 'Projekt po godzinach' },
    summary: { en: 'Ideas, tasks and resources.', pl: 'Pomysły, zadania i materiały.' },
    featured: true,
    groups: [
      {
        emoji: '💡',
        title: { en: 'Ideas', pl: 'Pomysły' },
        items: [
          {
            note: {
              en: 'Write the idea down before it is gone. Sort it out later.',
              pl: 'Zapisz pomysł, zanim ucieknie. Uporządkujesz go później.',
            },
            color: 'amber',
          },
        ],
      },
      {
        emoji: '✅',
        title: { en: 'To do', pl: 'Do zrobienia' },
        items: [
          {
            todo: {
              en: 'Pick one small thing for this week',
              pl: 'Wybierz jedną małą rzecz na ten tydzień',
            },
          },
        ],
      },
      {
        emoji: '🔗',
        title: { en: 'Resources', pl: 'Materiały' },
        items: [
          {
            note: {
              en: 'Docs and tools you keep coming back to.',
              pl: 'Dokumentacja i narzędzia, do których ciągle wracasz.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'job-hunt',
    emoji: '🧭',
    name: { en: 'Job hunt', pl: 'Szukanie pracy' },
    summary: {
      en: 'Openings, applications and interview prep.',
      pl: 'Oferty, wysłane zgłoszenia i przygotowanie do rozmów.',
    },
    featured: false,
    groups: [
      {
        emoji: '📌',
        title: { en: 'To apply', pl: 'Do wysłania' },
        items: [
          {
            note: {
              en: 'Drag job postings here straight from your tabs.',
              pl: 'Przeciągaj tu oferty prosto z kart.',
            },
          },
        ],
      },
      {
        emoji: '📨',
        title: { en: 'Applied', pl: 'Wysłane' },
        items: [
          {
            note: {
              en: 'Add the date to each link. A reminder a week later helps with the follow-up.',
              pl: 'Dopisz datę do każdego linku. Przypomnienie po tygodniu pomoże się odezwać.',
            },
            color: 'sky',
          },
        ],
      },
      {
        emoji: '🗣️',
        title: { en: 'Interviews', pl: 'Rozmowy' },
        items: [
          { todo: { en: 'Read up on the company', pl: 'Poczytaj o firmie' } },
          {
            todo: {
              en: 'Prepare three questions of your own',
              pl: 'Przygotuj trzy własne pytania',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'thesis',
    emoji: '📜',
    name: { en: 'Thesis', pl: 'Praca dyplomowa' },
    summary: {
      en: 'Sources, chapters and what your supervisor said.',
      pl: 'Źródła, rozdziały i uwagi promotora.',
    },
    featured: false,
    groups: [
      {
        emoji: '📚',
        title: { en: 'Sources', pl: 'Źródła' },
        items: [
          { link: 'https://scholar.google.com/', title: 'Google Scholar' },
          {
            note: {
              en: 'Note the page number next to every quote you save.',
              pl: 'Przy każdym zapisanym cytacie zanotuj numer strony.',
            },
          },
        ],
      },
      {
        emoji: '✍️',
        title: { en: 'Chapters', pl: 'Rozdziały' },
        items: [
          { todo: { en: 'Introduction', pl: 'Wstęp' } },
          { todo: { en: 'Method', pl: 'Metoda' } },
          { todo: { en: 'Results', pl: 'Wyniki' } },
        ],
      },
      {
        emoji: '🧑‍🏫',
        title: { en: 'Supervisor', pl: 'Promotor' },
        items: [
          {
            note: {
              en: 'What to change after the last meeting, in their words.',
              pl: 'Co poprawić po ostatnim spotkaniu, słowo w słowo.',
            },
            color: 'amber',
          },
        ],
      },
    ],
  },
  {
    id: 'trip',
    emoji: '🧳',
    name: { en: 'Trip', pl: 'Podróż' },
    summary: {
      en: 'Stays, tickets, places to see and what to pack.',
      pl: 'Noclegi, bilety, miejsca do zobaczenia i co spakować.',
    },
    featured: false,
    groups: [
      {
        emoji: '🏨',
        title: { en: 'Stays', pl: 'Noclegi' },
        items: [
          {
            note: {
              en: 'Save two or three places and compare them side by side.',
              pl: 'Zapisz dwa, trzy miejsca i porównaj je obok siebie.',
            },
          },
        ],
      },
      {
        emoji: '🎟️',
        title: { en: 'Tickets', pl: 'Bilety' },
        items: [
          {
            note: {
              en: 'Booking confirmations go here, so they are one click away on the day.',
              pl: 'Tu trafiają potwierdzenia rezerwacji, żeby w dniu wyjazdu były pod ręką.',
            },
          },
        ],
      },
      {
        emoji: '📍',
        title: { en: 'Places', pl: 'Miejsca' },
        items: [
          {
            note: {
              en: 'Map links for each place, with a note on when it is open.',
              pl: 'Linki do map dla każdego miejsca, z notatką, kiedy jest otwarte.',
            },
          },
        ],
      },
      {
        emoji: '🎒',
        title: { en: 'Pack', pl: 'Spakuj' },
        items: [
          { todo: { en: 'Passport or ID', pl: 'Paszport albo dowód' } },
          { todo: { en: 'Charger', pl: 'Ładowarka' } },
        ],
      },
    ],
  },
  {
    id: 'moving',
    emoji: '📦',
    name: { en: 'Moving house', pl: 'Przeprowadzka' },
    summary: {
      en: 'Flats to see, the move and the paperwork.',
      pl: 'Mieszkania do obejrzenia, przeprowadzka i formalności.',
    },
    featured: false,
    groups: [
      {
        emoji: '🏡',
        title: { en: 'Flats', pl: 'Mieszkania' },
        items: [
          {
            note: {
              en: 'Write down what you liked right after each viewing.',
              pl: 'Zaraz po oglądaniu zapisz, co Ci się podobało.',
            },
          },
        ],
      },
      {
        emoji: '🚚',
        title: { en: 'The move', pl: 'Przewóz rzeczy' },
        items: [{ todo: { en: 'Get two quotes', pl: 'Weź dwie wyceny' } }],
      },
      {
        emoji: '🧾',
        title: { en: 'Paperwork', pl: 'Formalności' },
        items: [
          { todo: { en: 'Change your address', pl: 'Zmień adres' } },
          {
            todo: {
              en: 'Move the internet and the bills',
              pl: 'Przenieś internet i rachunki',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'gifts',
    emoji: '🎁',
    name: { en: 'Gift list', pl: 'Prezenty' },
    summary: {
      en: 'Ideas for each person, what is bought and the budget.',
      pl: 'Pomysły dla każdej osoby, co już kupione i budżet.',
    },
    featured: false,
    groups: [
      {
        emoji: '💡',
        title: { en: 'Ideas', pl: 'Pomysły' },
        items: [
          {
            note: {
              en: 'One link per idea, with a note on who it is for.',
              pl: 'Jeden link na pomysł, z dopiskiem, dla kogo.',
            },
          },
        ],
      },
      {
        emoji: '🛍️',
        title: { en: 'Bought', pl: 'Kupione' },
        items: [
          {
            note: {
              en: 'Drag a link here once it is ordered.',
              pl: 'Przeciągnij tu link, kiedy prezent jest zamówiony.',
            },
          },
        ],
      },
      {
        emoji: '💸',
        title: { en: 'Budget', pl: 'Budżet' },
        items: [
          {
            note: {
              en: 'Set the total before you start looking.',
              pl: 'Ustal kwotę, zanim zaczniesz szukać.',
            },
            color: 'lime',
          },
        ],
      },
    ],
  },
  {
    id: 'weekly',
    emoji: '🗓️',
    name: { en: 'Weekly reset', pl: 'Plan tygodnia' },
    summary: {
      en: 'This week, waiting on others, and read later.',
      pl: 'Ten tydzień, czekam na innych i do przeczytania.',
    },
    featured: false,
    groups: [
      {
        emoji: '🎯',
        title: { en: 'This week', pl: 'Ten tydzień' },
        items: [
          {
            todo: {
              en: 'Three things that matter most',
              pl: 'Trzy najważniejsze rzeczy',
            },
          },
        ],
      },
      {
        emoji: '⏳',
        title: { en: 'Waiting', pl: 'Czekam' },
        items: [
          {
            note: {
              en: 'Who owes you a reply, and since when.',
              pl: 'Kto ma Ci odpisać i od kiedy.',
            },
          },
        ],
      },
      {
        emoji: '📚',
        title: { en: 'Read later', pl: 'Do przeczytania' },
        items: [
          {
            note: {
              en: 'Clear this group every Friday.',
              pl: 'Czyść tę grupę w każdy piątek.',
            },
          },
        ],
      },
    ],
  },
]
