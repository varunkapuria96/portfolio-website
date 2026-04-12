import { Link } from 'react-router-dom'

const PROJECTS = [
  {
    id: 'todo',
    lang: 'JavaScript',
    name: 'Todo App',
    desc: 'Full-stack task manager with auth, real-time sync, and CRUD operations.',
    tags: ['React', 'Supabase', 'Vite'],
    live: true,
    href: '/projects/todo',
  },
  {
    id: 'btc',
    lang: 'Python',
    name: 'BTC Prediction',
    desc: 'Machine learning model to predict Bitcoin price movements.',
    tags: ['Python', 'ML'],
    href: 'https://github.com/varunkapuria96/btcprediction',
  },
  {
    id: 'cnn',
    lang: 'Jupyter',
    name: 'CNN Image Classifier',
    desc: 'AlexNet architecture for image classification on the Oxford-IIIT Pet Dataset.',
    tags: ['Python', 'CNN', 'AlexNet'],
    href: 'https://github.com/varunkapuria96/image-data-classification-cnn-alexnet',
  },
  {
    id: 'attrition',
    lang: 'R',
    name: 'Employee Attrition',
    desc: 'Analysis of employee attrition costs and mitigation strategies.',
    tags: ['R', 'Analytics'],
    href: 'https://github.com/varunkapuria96/employeeatrittion',
  },
  {
    id: 'retail',
    lang: 'SQL / PHP',
    name: 'Retail Website + SQL',
    desc: 'Full backend with DDL, DML, DCL scripts and ASP.NET frontend for Harbor Freight.',
    tags: ['SQL', 'PHP', 'ASP.NET'],
    href: 'https://github.com/varunkapuria96/Website-Implementation-with-SQL',
  },
  {
    id: 'etl',
    lang: 'HCL / Python',
    name: 'ETL Warehouse',
    desc: 'Northwind database ETL pipeline using SSIS and Visual Studio.',
    tags: ['SSIS', 'SQL', 'ETL'],
    href: 'https://github.com/varunkapuria96/ETL-Datawarehouse-SSIS-VisualStudio',
  },
]

function ProjectCard({ lang, name, desc, tags, live, href }) {
  const className = `project-card${live ? ' live' : ''}`

  if (live) {
    return (
      <Link to={href} className={className}>
        <span className="live-badge">LIVE</span>
        <div className="project-lang">{lang}</div>
        <div className="project-name">{name}</div>
        <div className="project-desc">{desc}</div>
        <div className="project-tags">
          {tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      </Link>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      <div className="project-lang">{lang}</div>
      <div className="project-name">{name}</div>
      <div className="project-desc">{desc}</div>
      <div className="project-tags">
        {tags.map(t => <span key={t} className="tag">{t}</span>)}
      </div>
    </a>
  )
}

export default function Portfolio() {
  return (
    <>
      <section className="hero">
        <p className="hero-tag">// hello world</p>
        <h1>
          Varun<br />
          Kapuria<span className="accent">.</span>
        </h1>
        <p className="hero-sub">
          Sales analyst turned builder. I use data to drive decisions at work —
          and build small experiments on the side to learn how things get made.
        </p>
        <div className="hero-links">
          <a href="#experiments" className="btn-primary">↓ projects</a>
          <a
            href="https://github.com/varunkapuria96"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
          <a
            href="https://www.linkedin.com/in/varunkapuria96"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn ↗
          </a>
        </div>
      </section>

      <div className="section-label">
        <span>// experiments</span>
      </div>

      <section id="experiments" className="projects-grid">
        {PROJECTS.map(p => (
          <ProjectCard key={p.id} {...p} />
        ))}
      </section>

      <footer className="portfolio-footer">
        <span>varun kapuria</span>
        <span>boston, ma · built with <span className="accent">react</span></span>
      </footer>
    </>
  )
}
