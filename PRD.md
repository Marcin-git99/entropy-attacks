# PRD - Entropy Attacks

## 1. Opis projektu

**Entropy Attacks** to gra symulacyjna. Gra symuluje kokpit myśliwca, który patroluje przestrzeń kosmiczną i jego zadaniem jest wykryć i zniszczyć wszystkie Entropy. Entropy to wrogie obiekty pojawiające się na radarze.


## 2. Wprowadzenie do gry
Gra polega na uratowaniu planety Repo. Planeta Repo w wyniku nadmiernej eksploatacji zasobów stała się niestabilna sejsmicznie i klimatycznie. W celu utrzymania życia na planecie bez przerwy działa centralny L2SM. Jest to "Large Smart Statistic Model" który reguluje wszystkie procesy na planecie, od cyrkulacji wody w atmosferze, po działanie lodówek w domach. Wszytsko po to żeby oszczędzać deficytowe zasby.
Planeta Repo stała się celem dla istot z systemów Rozmytych tak zwanych Entropów. Entropy podporządkowują sobie napotkane cywilizacje wstrzykując do systemów operacyjnych fragmenty kodu tak zwany Indirect Prompt Injection - IPI. Te fragmenty kodu mają zwiększyć entropię systemów powodując burzę halucynacji i w konsekwencji rozpad systemu.
---

## 2. Tech Stack

### Frontend

| Technologia | Wersja | Zastosowanie |
|-------------|--------|--------------|
| **Astro** | 5.x | Framework SSG, routing, strony statyczne |
| **React** | 19.x | Interaktywne komponenty (islands) |
| **TypeScript** | 5.x | Typowanie statyczne |
| **Tailwind CSS** | 4.x | Stylowanie utility-first |
| **Shadcn/ui** | latest | Komponenty UI (Radix + Tailwind) |
| **Zustand** | 5.x | Zarządzanie stanem gry (localStorage persist) |
| **Zod** | 3.x | Walidacja schematów stanu gry |
lub zaproponuj coś innego bardziej odpowiedniego

### Infrastruktura

| Technologia | Zastosowanie |
|-------------|--------------|
| **Vercel** | Hosting statyczny, deployment |
| **GitHub Actions** | CI/CD pipeline |
lub zaproponuj coś innego bardziej odpowiedniego

### Testowanie

| Technologia | Zastosowanie |
|-------------|--------------|
| **Vitest** | Unit testy logiki gry |
| **Testing Library** | Testy komponentów React |
| **Playwright** | Testy E2E |
lub zaproponuj coś innego bardziej odpowiedniego

### Quality Assurance

| Technologia | Zastosowanie |
|-------------|--------------|
| **ESLint** | Linting (flat config) |
| **Prettier** | Formatowanie kodu |
lub zaproponuj coś innego bardziej odpowiedniego
---

## 3. Mechanika gry

### 3.1 Struktura tury

Symulacja: Sterujesz całym statkiem musisz tak sterować strzałkami góra - 8; dół - 2; lewo -6; prawo - 4 aby złapać wrogiego Entropa w celownik.


### 3.2 System walki

| Warunek | Rezultat |
|---------|----------|
| należy uchwycić w celownik wrogiego entropa i nacisnąć G -działko lub R - rakiety | Atak udany - jednostka otrzymuje trafienie jeżeli jest w środku celownika|
| jeżeli jednostka Entrop jest poza celownikiem | Atak nieudany |
| Trafienie jednostki | Zniszczenie jednostki - wybuch|


### 3.3 Warunki zwycięstwa

1. Zniszczenie wszystkich jednostek przeciwnika, czyli wszystkich Entropów

### 3.4 Łączność - specjalne zasady

Dostajesz komunikaty o nadciąganiu wrogich Entropów. Widzisz wrogów na radarze i misisz strzałkami góra - 8; dół - 2; lewo -6; prawo - 4

---

## 4. Wrogie jednostki
Najpierw są małe, wtedy na krawędzi radaru i się powiększają w miarę zbliżania się do centrum radaru.
Radaw wskazuje wrogów w postaci czerwonych punktów.
---

## 5. Plansza i ustawienie początkowe

Widać kokpit i gwiazdy w postaci punków na niebie. Radar nie wskazuje wrogich celów.

---

## 6. Interfejs użytkownika

### 6.1 Ekran startowy
- Tytuł gry
- Wprowadzenie do gry
- Komputer steruje Entropami

### 6.2 Ekran gry
| Element | Opis |
|---------|------|
| **Plansza** | Wprowadzenie do gry |
| **Panel kontrolny** | Kokpit |
| **Dziennik gry** | Ilość zniszczonych jednostek wroga |
| **Panel zasad** | informacja o ograniczonej amunicji. Masz 3 rakiety samonaprawadzające i 16 pocisków do działka laserowego. Rakiety zawsze trafiają. |

### 6.3 Wizualne oznaczenia stanu
| Stan | Wizualizacja |
|------|--------------|
| Jednostka w cwlowniku | celownik zapala się na czerono |
| Wróg się zbliża | Czerone punkty na obrzeżach radaru |
| Atak | Czerwone punkty na radarze |
| Atakująca jednostka | Zielona ramka |
|
| Licznik zniszczonych jednostek |

---

## 7. AI przeciwnika


---

## 8. Struktura projektu


