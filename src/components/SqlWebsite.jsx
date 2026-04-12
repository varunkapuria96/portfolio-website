import { Link } from 'react-router-dom'

const TABLES = [
  {
    group: 'Customers & Accounts',
    items: [
      { name: 'CUSTOMERS', desc: 'Core customer records — name, email, phone, password' },
      { name: 'CLUB_MEMBER', desc: 'Harbor Freight Inside Track Club membership tracking' },
      { name: 'CUSTOMER_ADDRESS', desc: 'Multiple shipping/billing addresses per customer' },
      { name: 'HFCC', desc: 'Harbor Freight credit card records' },
    ],
  },
  {
    group: 'Products & Inventory',
    items: [
      { name: 'PRODUCTS', desc: 'Product catalog with SKU, pricing, and department linkage' },
      { name: 'DEPARTMENTS', desc: 'Store department classification' },
      { name: 'ITEMS', desc: 'Individual inventory units linked to products' },
      { name: 'DEALS', desc: 'Promotional deals and discount definitions' },
      { name: 'DEALS_ON_PRODUCTS', desc: 'Junction table linking deals to specific products' },
      { name: 'GIFT_CARDS', desc: 'Gift card issuance and balance tracking' },
    ],
  },
  {
    group: 'Orders & Transactions',
    items: [
      { name: 'ORDERS', desc: 'Customer orders with status, shipping method, and totals' },
      { name: 'ITEMS_IN_ORDERS', desc: 'Line items per order with quantity and unit price' },
      { name: 'COUPONS', desc: 'Coupon codes and discount rules' },
      { name: 'RETURNS', desc: 'Return requests and refund status' },
    ],
  },
  {
    group: 'Services',
    items: [
      { name: 'SERVICES', desc: 'Tool repair and assembly services offered' },
      { name: 'SERVICE_PROFESSIONALS', desc: 'Staff handling service jobs' },
      { name: 'SERVICE_TYPES', desc: 'Categories of service work available' },
    ],
  },
  {
    group: 'Store Operations',
    items: [
      { name: 'STORES', desc: 'Physical store locations across US states' },
      { name: 'STORE_HOURS', desc: 'Operating hours per store and day' },
      { name: 'SHIPPING_METHOD', desc: 'Flat Rate, Express, and Truck delivery options' },
      { name: 'AGENTS', desc: 'Customer care agent profiles' },
      { name: 'CUSTOMER_CARE', desc: 'Support tickets and resolution tracking' },
    ],
  },
  {
    group: 'Reviews & Engagement',
    items: [
      { name: 'REVIEW_DETAILS', desc: 'Customer product reviews and ratings' },
      { name: 'GIFT_CARD_ACTIVATION', desc: 'Gift card redemption and activation log' },
    ],
  },
]

const PAGES = [
  { file: 'index.php', desc: 'Login and registration entry point' },
  { file: 'home.php', desc: 'Homepage with featured products and deals' },
  { file: 'products.php', desc: 'Product catalog with department filtering' },
  { file: 'shopping.php', desc: 'Shopping cart management' },
  { file: 'orders.php', desc: 'Order history and status tracking' },
  { file: 'account_details.php', desc: 'Customer profile management' },
  { file: 'address_details.php', desc: 'Saved addresses CRUD' },
  { file: 'frequently_purchased.php', desc: 'Personalized reorder suggestions' },
  { file: 'write_review.php', desc: 'Product review submission form' },
  { file: 'my_queries.php', desc: 'Customer support ticket submission' },
  { file: 'customer_care.php', desc: 'Agent-facing support dashboard' },
  { file: 'gift_card.php', desc: 'Gift card purchase and activation' },
  { file: 'returns.php', desc: 'Return request initiation' },
  { file: 'my_registration.php', desc: 'New account registration flow' },
]

export default function SqlWebsite() {
  return (
    <div className="doc-page">
      <div className="doc-back">
        <Link to="/">← back</Link>
      </div>

      <header className="doc-header">
        <p className="hero-tag">// project docs</p>
        <h1>Retail Website<br /><span className="accent">+ SQL Backend</span></h1>
        <p className="doc-subtitle">
          Full-stack e-commerce implementation for Harbor Freight Tools — Oracle SQL
          database with a PHP frontend, hosted on Amazon EC2.
        </p>
        <div className="doc-meta">
          <span className="doc-meta-item">PHP · Oracle SQL · EC2</span>
          <span className="doc-meta-sep">//</span>
          <a
            href="https://github.com/varunkapuria96/Website-Implementation-with-SQL"
            target="_blank"
            rel="noreferrer"
            className="doc-meta-link"
          >
            GitHub ↗
          </a>
          <span className="doc-meta-sep">//</span>
          <a
            href="https://github.com/varunkapuria96/Website-Implementation-with-SQL/blob/main/Final%20Report.pdf"
            target="_blank"
            rel="noreferrer"
            className="doc-meta-link"
          >
            Final Report ↗
          </a>
          <span className="doc-meta-sep">//</span>
          <a
            href="https://github.com/varunkapuria96/Website-Implementation-with-SQL/blob/main/Final%20ER%20Diagram.jpg"
            target="_blank"
            rel="noreferrer"
            className="doc-meta-link"
          >
            ER Diagram ↗
          </a>
        </div>
      </header>

      <div className="doc-body">

        <section className="doc-section">
          <div className="section-label"><span>// overview</span></div>
          <p className="doc-text">
            This project implements a functioning e-commerce web application modelled after
            the Harbor Freight Tools online store. The system covers the full retail lifecycle:
            customer registration and authentication, product browsing, cart and checkout,
            order tracking, returns, gift cards, service bookings, and customer support ticketing.
          </p>
          <p className="doc-text">
            The database layer is built on Oracle SQL with 22 tables, sequences for
            auto-incrementing IDs, and triggers enforcing data integrity constraints. The frontend
            is a PHP application that connects to Oracle via OCI8, rendering dynamic pages
            server-side. The stack was deployed on an Amazon EC2 instance.
          </p>
        </section>

        <section className="doc-section">
          <div className="section-label"><span>// tech stack</span></div>
          <div className="doc-stack">
            <div className="stack-item">
              <div className="stack-label">Database</div>
              <div className="stack-value">Oracle SQL — DDL, DML, DCL scripts</div>
            </div>
            <div className="stack-item">
              <div className="stack-label">Frontend</div>
              <div className="stack-value">PHP with OCI8 for Oracle connectivity</div>
            </div>
            <div className="stack-item">
              <div className="stack-label">Hosting</div>
              <div className="stack-value">Amazon EC2</div>
            </div>
            <div className="stack-item">
              <div className="stack-label">Schema</div>
              <div className="stack-value">22 tables, 15+ sequences &amp; triggers</div>
            </div>
          </div>
        </section>

        <section className="doc-section">
          <div className="section-label"><span>// database schema</span></div>
          <p className="doc-text">
            The schema is organised into six functional groups. Each table uses a
            sequence-backed trigger for primary key generation.
          </p>
          {TABLES.map(group => (
            <div key={group.group} className="schema-group">
              <div className="schema-group-name">{group.group}</div>
              <div className="schema-table-list">
                {group.items.map(t => (
                  <div key={t.name} className="schema-row">
                    <span className="schema-table-name">{t.name}</span>
                    <span className="schema-table-desc">{t.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="doc-section">
          <div className="section-label"><span>// pages &amp; routes</span></div>
          <p className="doc-text">
            Each PHP file corresponds to a distinct user-facing page. All pages connect to
            Oracle via <code className="doc-code">connection.php</code> and query the database
            dynamically based on the authenticated session.
          </p>
          <div className="pages-list">
            {PAGES.map(p => (
              <div key={p.file} className="page-row">
                <span className="page-file">{p.file}</span>
                <span className="page-desc">{p.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="doc-section">
          <div className="section-label"><span>// database scripts</span></div>
          <div className="doc-stack">
            <div className="stack-item">
              <div className="stack-label">DDL</div>
              <div className="stack-value">
                Table creation scripts in <code className="doc-code">/tablecreation</code> —
                defines all 22 tables with constraints, check conditions, and foreign keys
              </div>
            </div>
            <div className="stack-item">
              <div className="stack-label">DML</div>
              <div className="stack-value">
                Query scripts in <code className="doc-code">/queries</code> —
                inserts, updates, and analytical queries across the schema
              </div>
            </div>
            <div className="stack-item">
              <div className="stack-label">DCL</div>
              <div className="stack-value">
                Grants and role-based access control for database users
              </div>
            </div>
            <div className="stack-item">
              <div className="stack-label">Triggers &amp; Procedures</div>
              <div className="stack-value">
                Automation scripts in <code className="doc-code">/triggersandprocedures</code> —
                sequences for ID generation, integrity triggers, stored procedures
              </div>
            </div>
          </div>
        </section>

        <section className="doc-section">
          <div className="section-label"><span>// references</span></div>
          <div className="doc-refs">
            <a
              href="https://github.com/varunkapuria96/Website-Implementation-with-SQL/blob/main/Final%20Report.pdf"
              target="_blank"
              rel="noreferrer"
              className="doc-ref-link"
            >
              Final Report.pdf — full project documentation with DDL, DML, and DCL listings ↗
            </a>
            <a
              href="https://github.com/varunkapuria96/Website-Implementation-with-SQL/blob/main/Final%20ER%20Diagram.jpg"
              target="_blank"
              rel="noreferrer"
              className="doc-ref-link"
            >
              Final ER Diagram.jpg — entity relationship diagram for the full schema ↗
            </a>
            <a
              href="https://github.com/varunkapuria96/Website-Implementation-with-SQL"
              target="_blank"
              rel="noreferrer"
              className="doc-ref-link"
            >
              GitHub Repository — source code for all PHP pages and SQL scripts ↗
            </a>
          </div>
        </section>

      </div>

      <footer className="portfolio-footer">
        <span>varun kapuria</span>
        <span>boston, ma · built with <span className="accent">react</span></span>
      </footer>
    </div>
  )
}
