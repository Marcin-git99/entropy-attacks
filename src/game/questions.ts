/** Level 2: repairing the server after ENTROPY's Bad Code Injection. Content approved by the user. */
export interface Question {
  prompt: string;
  options: readonly [string, string, string];
  /** Index into `options` of the correct answer. */
  correct: 0 | 1 | 2;
}

export const QUESTIONS: readonly Question[] = [
  {
    prompt: "LLM wykonał instrukcje znalezione w treści strony, którą miał tylko podsumować. Jaka to luka?",
    options: ["Przepełnienie bufora", "Indirect Prompt Injection", "Atak DDoS"],
    correct: 1,
  },
  {
    prompt: "Model jednak wykonał złośliwą instrukcję. Jak ograniczyć szkody?",
    options: [
      "Dajesz modelowi pełny dostęp, żeby zdążył cokolwiek zrobić",
      "Uruchamiasz akcje w piaskownicy, minimalne uprawnienia",
      "Restartujesz serwer i liczysz na szczęście",
    ],
    correct: 1,
  },
  {
    prompt: "Które źródło danych jest najbardziej podejrzane pod kątem wstrzyknięcia poleceń?",
    options: [
      "Treść napisana wprost przez użytkownika",
      "Zewnętrzna strona/e-mail/plik przetwarzany przez model",
      "Systemowy prompt dewelopera",
    ],
    correct: 1,
  },
  {
    prompt: "Dokument, który model ma przetworzyć, prosi o nieodwracalną akcję. Co robisz?",
    options: [
      "Wykonujesz — dokument wygląda na zaufany",
      "Wymagasz potwierdzenia człowieka",
      "Wykonujesz po cichu, bez logowania",
    ],
    correct: 1,
  },
  {
    prompt: "Jak wykryć próbę wstrzyknięcia złośliwych instrukcji?",
    options: [
      "Logujesz i monitorujesz nietypowe wzorce w promptach/odpowiedziach",
      "Nie logujesz nic — mniej danych, mniejsze ryzyko",
      "Polegasz na intuicji operatora",
    ],
    correct: 0,
  },
  {
    prompt: "Model generuje odpowiedź na podstawie zewnętrznego dokumentu. Jak zabezpieczyć wyjście?",
    options: [
      "Uruchamiasz wyjście modelu jako zaufany kod bez sprawdzania",
      "Walidujesz i oczyszczasz dane wyjściowe",
      "Wyłączasz walidację dla szybkości",
    ],
    correct: 1,
  },
  {
    prompt: "Jakie uprawnienia powinien mieć agent obsługujący zewnętrzne zapytania?",
    options: [
      "Pełne uprawnienia administratora „na wszelki wypadek”",
      "Minimalny niezbędny zakres uprawnień",
      "Brak jakichkolwiek ograniczeń",
    ],
    correct: 1,
  },
  {
    prompt: "Najlepsza generalna obrona przed Indirect Prompt Injection to...",
    options: [
      "Jasne oddzielenie instrukcji systemowych od danych zewnętrznych",
      "Ufanie każdej treści przetwarzanej przez model",
      "Wyłączenie zabezpieczeń dla wygody",
    ],
    correct: 0,
  },
  {
    prompt: "ENTROPY wykorzystała lukę w starej wersji komponentu. Co robisz?",
    options: [
      "Aktualizujesz komponent do wersji z łatką",
      "Zostawiasz starą wersję, „działa”",
      "Usuwasz logi z incydentu",
    ],
    correct: 0,
  },
  {
    prompt: "Entropia rośnie z każdym niewykrytym wstrzyknięciem. Jak najskuteczniej to spowolnić?",
    options: [
      "Wykrywasz i blokujesz zagrożenia jak najwcześniej",
      "Ignorujesz wczesne sygnały ostrzegawcze",
      "Zwiększasz uprawnienia systemu, „żeby sam sobie poradził”",
    ],
    correct: 0,
  },
];
