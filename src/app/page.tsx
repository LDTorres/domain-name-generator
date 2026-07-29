import { presets } from "@/data";
import { BrandStudio } from "@/features/generator/brand-studio";

export default function HomePage() {
  return <BrandStudio presets={presets} />;
}
