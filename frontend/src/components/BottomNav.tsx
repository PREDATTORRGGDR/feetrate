import { IconBooks, IconHome2, IconStar, IconUserCircle } from "@tabler/icons-react";
import type { TabName } from "../App";

interface BottomNavProps {
  activeTab: TabName;
  onSelect: (tab: TabName) => void;
}

const TABS: { name: TabName; label: string; icon: typeof IconHome2 }[] = [
  { name: "home", label: "Главная", icon: IconHome2 },
  { name: "rating", label: "Оценить", icon: IconStar },
  { name: "guides", label: "Гайды", icon: IconBooks },
  { name: "profile", label: "Профиль", icon: IconUserCircle },
];

export default function BottomNav({ activeTab, onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ name, label, icon: Icon }) => {
        const isActive = activeTab === name;
        return (
          <button
            key={name}
            type="button"
            className={`bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`}
            onClick={() => onSelect(name)}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={24} stroke={isActive ? 2.2 : 1.8} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
