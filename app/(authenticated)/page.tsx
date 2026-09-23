import { HomeMenuCard } from "@/components/home-menu-card";

const menuItems = [
  {
    title: "Мої тренування",
    description: "Переглядай та запускай свої тренування",
    icon: "dumbbell",
    href: "/workouts",
  },
  {
    title: "Створити тренування",
    description: "Створи нове тренування та додай вправи",
    icon: "plus",
    href: "/workouts/new",
  },
  {
    title: "Прогрес",
    description: "Переглядай результати та динаміку тренувань",
    icon: "chart",
    href: "/progress",
  },
  {
    title: "Вправи",
    description: "Переглядай та керуй списком вправ",
    icon: "list",
    href: "/exercises",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="type-heading-xl">Training Labs</h1>
        <p className="type-body-m">Тренуйся. Відстежуй. Прогресуй</p>
      </header>
      <ul className="flex flex-col gap-4" aria-label="Розділи Training Labs">
        {menuItems.map((item) => (
          <HomeMenuCard key={item.icon} {...item} />
        ))}
      </ul>
    </main>
  );
}
