import { MotionConfig } from 'motion/react'
import { useScenario } from './hooks/useScenario'
import { Hero } from './components/sections/Hero'
import { Intro } from './components/sections/Intro'
import { SalarySection } from './components/sections/SalarySection'
import { Mp2Section } from './components/sections/Mp2Section'
import { RealValueSection } from './components/sections/RealValueSection'
import { BanksSection } from './components/sections/BanksSection'
import { CompareSection } from './components/sections/CompareSection'
import { InflationSection } from './components/sections/InflationSection'
import { FuelSection } from './components/sections/FuelSection'
import { FaqSection } from './components/sections/FaqSection'
import { Footer } from './components/sections/Footer'

export default function App() {
  const s = useScenario()
  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Hero />
      <main id="main">
        <Intro />
        <SalarySection s={s} />
        <Mp2Section s={s} />
        <RealValueSection s={s} />
        <BanksSection s={s} />
        <CompareSection s={s} />
        <InflationSection />
        <FuelSection />
        <FaqSection />
      </main>
      <Footer />
    </MotionConfig>
  )
}
