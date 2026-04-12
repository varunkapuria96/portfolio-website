import { Link } from 'react-router-dom'

const QUERIES = [
  {
    id: 'q1',
    title: 'Frequently purchased together',
    desc: 'Displays the top 3 products purchased alongside a given product in past orders, along with how many times they were ordered together. Helps customers locate related products and increases average order value.',
    sql: `WITH
order_products AS(
  SELECT orderid, p.productname
  FROM items_in_orders io
  JOIN items i ON io.serialnumber=i.serialnumber
  JOIN products p ON i.productid=p.productid
),
ordered_together AS(
  SELECT a.productname, b.productname AS second_product,
    COUNT(*) AS times_ordered_together,
    row_number() OVER(PARTITION BY a.productname
      ORDER BY COUNT(*) DESC) as rn
  FROM order_products a
  JOIN order_products b ON a.orderid=b.orderid
  WHERE a.productname<>b.productname
  GROUP BY a.productname, b.productname
)
SELECT productname, second_product,
  times_ordered_together,
  rn AS rank_of_second_product
FROM ordered_together
WHERE rn<=3;`,
  },
  {
    id: 'q2',
    title: 'Top deals on best selling products',
    desc: 'Finds the top 3 deals on products that are sold more times than average. Helps customers discover the best discounts on popular items.',
    sql: `WITH
average_times_ordered AS(
  SELECT ROUND(AVG(TotalNumberOfTimesOrdered),2)
    AS AverageNumberOfTimesOrdered
  FROM (
    SELECT p.productid, COUNT(*) AS TotalNumberOfTimesOrdered
    FROM items_in_orders io
    JOIN items i ON io.serialnumber = i.serialnumber
    JOIN products p ON p.productid = i.productid
    GROUP BY p.productid
  ) t
),
best_selling_products AS(
  SELECT p.productid, p.productname, p.priceperunit,
    COUNT(*) AS NumberOfTimesOrdered
  FROM items_in_orders io
  JOIN items i ON io.serialnumber = i.serialnumber
  JOIN products p ON p.productid = i.productid
  HAVING COUNT(*) > (SELECT AverageNumberOfTimesOrdered
                     FROM average_times_ordered)
  GROUP BY p.productid, p.productname, p.priceperunit
)
SELECT * FROM (
  SELECT bsp.productname, d.discountPercentage,
    (bsp.priceperunit*d.discountPercentage)/100 AS discountValue,
    row_number() OVER(ORDER BY
      (bsp.priceperunit*d.discountPercentage)/100 DESC
    ) AS rank_of_values
  FROM deals_on_products dop
  JOIN best_selling_products bsp ON dop.productid = bsp.productid
  JOIN deals d ON dop.dealid = d.dealid
)
WHERE rank_of_values<=3;`,
  },
  {
    id: 'q3',
    title: 'Eligible for free delivery',
    desc: 'Checks if a product is eligible for free delivery by verifying that available units exist in a store with the same zip code as the customer. Increases likelihood of purchase for convenience-driven customers.',
    sql: `SELECT CASE WHEN avail>0 THEN 'Yes' ELSE 'No' END
  AS "Eligible for free delivery?"
FROM (
  SELECT COUNT(*) AS avail
  FROM customer_address ca
  JOIN stores s ON ca.zipcode=s.zipcode
  JOIN items i ON s.storeid=i.storeid
  JOIN products p ON i.productid=p.productid
  WHERE ca.custid='100007'
    AND availability=1
    AND p.productid='1006'
);`,
  },
  {
    id: 'q4',
    title: 'Total money saved through deals and coupons',
    desc: 'Calculates total savings per customer across all past orders by summing deal discounts and coupon deductions. Promotes brand loyalty by showing customers how much they have saved.',
    sql: `WITH discount AS(
  SELECT custid,
    SUM((p.priceperunit*d.discountPercentage)/100) AS discountValue
  FROM orders o
  JOIN items_in_orders io ON io.orderid = o.orderid
  JOIN items i ON i.serialnumber = io.serialnumber
  JOIN products p ON p.productid = i.productid
  JOIN deals_on_products dop ON dop.productid = p.productid
  JOIN deals d ON dop.dealid = d.dealid
  GROUP BY custid
),
coupon AS(
  SELECT custid, SUM(coupondiscount) AS couponDiscount
  FROM orders
  GROUP BY custid
)
SELECT discount.custid,
  discount.discountValue + coupon.couponDiscount AS TotalMoneySaved
FROM discount
JOIN coupon ON discount.custid = coupon.custid;`,
  },
  {
    id: 'q5',
    title: 'Low stock alert',
    desc: 'Returns products with 5 or fewer available units in stock. Used to display urgency alerts on product pages to encourage timely purchases.',
    sql: `SELECT p.productid, COUNT(*)
FROM products p
JOIN items i ON p.productid=i.productid
WHERE availability=1
GROUP BY p.productid
HAVING COUNT(*)<=5;`,
  },
  {
    id: 'q6',
    title: 'Top products of the season',
    desc: 'Displays the top 3 products purchased most in the current season (Spring/Summer/Fall/Winter) based on historical orders from the same season in prior years. Surfaces relevant seasonal inventory (e.g. gardening tools in Summer).',
    sql: `WITH display_current_season AS (
  SELECT CASE
    WHEN EXTRACT(MONTH FROM current_date) IN (6,7,8)  THEN 'Summer'
    WHEN EXTRACT(MONTH FROM current_date) IN (9,10,11) THEN 'Fall'
    WHEN EXTRACT(MONTH FROM current_date) IN (12,1,2) THEN 'Winter'
    WHEN EXTRACT(MONTH FROM current_date) IN (3,4,5)  THEN 'Spring'
  END AS current_season
  FROM dual
),
order_season AS (
  SELECT o.orderid, productid, CASE
    WHEN EXTRACT(MONTH FROM orderdate) IN (6,7,8)  THEN 'Summer'
    WHEN EXTRACT(MONTH FROM orderdate) IN (9,10,11) THEN 'Fall'
    WHEN EXTRACT(MONTH FROM orderdate) IN (12,1,2) THEN 'Winter'
    WHEN EXTRACT(MONTH FROM orderdate) IN (3,4,5)  THEN 'Spring'
  END AS order_season
  FROM orders o
  JOIN items_in_orders io ON o.orderid=io.orderid
  JOIN items i ON io.serialnumber=i.serialnumber
),
display_season_products AS (
  SELECT current_season, productid,
    COUNT(DISTINCT orderid) AS total_orders,
    row_number() OVER(PARTITION BY current_season
      ORDER BY COUNT(DISTINCT orderid) DESC) AS rank_of_product
  FROM display_current_season dcs
  JOIN order_season os ON dcs.current_season=os.order_season
  GROUP BY current_season, productid
)
SELECT * FROM display_season_products
WHERE rank_of_product<=3;`,
  },
  {
    id: 'q7',
    title: 'Average ratings for product',
    desc: 'Calculates the average star rating for a product, but only displays it when at least 5 verified reviews exist. Helps customers assess product quality before purchasing.',
    sql: `SELECT rd.productid, ROUND(AVG(ratings),2) AS avg_rating
FROM review_details rd
JOIN orders o ON rd.custid=o.custid
JOIN items_in_orders io ON o.orderid=io.orderid
JOIN items i ON io.serialnumber=i.serialnumber
GROUP BY rd.productid
HAVING COUNT(DISTINCT reviewid)>=5;`,
  },
  {
    id: 'q8',
    title: 'Average query resolution time',
    desc: 'Computes the average time (in hours) an agent takes to resolve customer tickets. Displayed to customers to set expectations on when their query will be resolved.',
    sql: `SELECT cc.agentid, agentfname,
  COALESCE(ROUND(AVG((resolutiondate-querydate)*24)),0)
    AS ResolutionTimeinHours
FROM customer_care cc
JOIN agents a ON a.agentid = cc.agentid
WHERE custid='100007' AND cc.agentid='104'
GROUP BY cc.agentid, agentfname;`,
  },
  {
    id: 'q9',
    title: 'Products eligible for return',
    desc: "Lists items from delivered orders that are still within the product's return window and haven't been returned yet. Also shows days remaining before the window closes.",
    sql: `SELECT o.orderid, p.productid, p.productname,
  i.serialnumber,
  ROUND((current_date - actualdeliverydate),0)
    AS return_period_ending_in
FROM orders o
JOIN items_in_orders io ON o.orderid=io.orderid
JOIN items i ON io.serialnumber=i.serialnumber
JOIN products p ON i.productid=p.productid
WHERE (current_date - actualdeliverydate)<=returnperiod
  AND orderstatus='Delivered'
  AND custid='100007'
  AND NOT EXISTS (
    SELECT orderid, serialnumber
    FROM returns r
    WHERE o.orderid=r.orderid
      AND io.serialnumber=r.serialnumber
  );`,
  },
  {
    id: 'q10',
    title: 'Recommend next best product',
    desc: "Uses the LEAD window function to recommend the top 3 products most frequently ordered after a customer's last purchase. Personalized next-product recommendations based on collective purchase history.",
    sql: `WITH all_orders AS (
  SELECT o.orderid, custid, orderdate, productname
  FROM orders o
  JOIN items_in_orders io ON o.orderid=io.orderid
  JOIN items i ON io.serialnumber=i.serialnumber
  JOIN products p ON i.productid=p.productid
),
next_best_product AS (
  SELECT custid, productname, orderid,
    LEAD(productname) OVER(PARTITION BY custid
      ORDER BY ORDERDATE) AS "Next Ordered",
    LEAD(orderid) OVER(PARTITION BY custid
      ORDER BY ORDERDATE) AS "Next Order ID"
  FROM all_orders
)
SELECT productname, "Next Ordered", count(*)
FROM next_best_product
WHERE "Next Ordered" IS NOT NULL
  AND orderid<>"Next Order ID"
  AND productname IN (
    SELECT productname
    FROM ORDERS o
    JOIN items_in_orders io ON o.orderid=io.orderid
    JOIN items i ON io.serialnumber=i.serialnumber
    JOIN products p ON i.productid=p.productid
    WHERE custid='100018'
      AND orderdate=(
        SELECT MAX(orderdate)
        FROM orders
        WHERE custid='100018'
      )
  )
GROUP BY productname, "Next Ordered"
ORDER BY COUNT(*) DESC
FETCH FIRST 3 ROWS ONLY;`,
  },
]

const TRIGGERS = [
  {
    id: 't1',
    title: 'update_numAgentTickets',
    desc: 'Fires AFTER UPDATE of agentID on CUSTOMER_CARE. Iterates all agents and sets their numberOfTickets to the count of tickets currently assigned to them. Keeps agent workload metrics accurate in real time.',
    sql: `CREATE OR REPLACE TRIGGER update_numAgentTickets
AFTER UPDATE OF AGENTID
ON CUSTOMER_CARE
DECLARE
  CURSOR numTicketsCursor IS
    SELECT agentid, count(*) as numTickets
    FROM CUSTOMER_CARE cc
    GROUP BY agentid;
BEGIN
  FOR updateNTCounter IN numTicketsCursor LOOP
    UPDATE AGENTS
    SET numberOfTickets = updateNTCounter.numTickets
    WHERE agentid = updateNTCounter.agentid;
  END LOOP;
END;
/`,
  },
  {
    id: 't2',
    title: 'update_walletBalance',
    desc: 'Fires BEFORE INSERT on GIFT_CARD_ACTIVATION. Reads the gift card amount and activation status — if not yet activated, adds the amount to the customer wallet and marks the card as used. Raises an application error if the card was already activated.',
    sql: `CREATE OR REPLACE TRIGGER update_walletBalance
BEFORE INSERT
ON GIFT_CARD_ACTIVATION
FOR EACH ROW
DECLARE
  gc_amount      GIFT_CARDS.amount%type;
  gc_isactivated GIFT_CARDS.isactivated%type;
BEGIN
  SELECT amount, isactivated
  INTO gc_amount, gc_isactivated
  FROM GIFT_CARDS
  WHERE serialnumber=:new.serialnumber;

  IF (gc_isactivated='No') THEN
    UPDATE CUSTOMERS
    SET walletBalance = walletBalance + gc_amount
    WHERE custid = :new.custid;

    UPDATE GIFT_CARDS
    SET isactivated='Yes'
    WHERE serialnumber = :new.serialnumber;
  ELSE
    raise_application_error(-20008,
      'Error: Gift card already activated!');
  END IF;
END;
/`,
  },
]

const PROCEDURE = {
  title: 'update_AgentID — Smart agent assignment',
  desc: "Assigns a customer query to an agent intelligently. Priority is set randomly (Low / Medium / High) as a stand-in for a future ML text-mining classifier. High-priority queries are routed to agents with the fastest average resolution time. For all priority levels, the agent with the fewest currently open tickets is selected.",
  sql: `CREATE OR REPLACE PROCEDURE update_AgentID
  (p_custqueryid IN CUSTOMER_CARE.custqueryid%type) AS
  queryAgent    AGENTS.agentid%type;
  randomPriority number;
  CURSOR queryCursor IS
    SELECT custqueryid FROM CUSTOMER_CARE;
BEGIN
  -- assign random priority (1=Low, 2=Medium, 3=High)
  SELECT round(dbms_random.value(1,3))
  INTO randomPriority
  FROM dual;

  UPDATE CUSTOMER_CARE
  SET queryPriority =
    CASE WHEN randomPriority=1 THEN 'Low'
         WHEN randomPriority=2 THEN 'Medium'
         WHEN randomPriority=3 THEN 'High'
    END
  WHERE custqueryid=p_custqueryid;

  IF randomPriority=3 THEN
    -- High priority: route to fastest agent with fewest open tickets
    SELECT agentid INTO queryAgent
    FROM (
      SELECT a.agentid,
        COUNT(CASE WHEN status='Open' THEN 1 END) AS openTickets,
        row_number() OVER(ORDER BY
          COUNT(CASE WHEN status='Open' THEN 1 END)
        ) AS lowestOpenTickets
      FROM AGENTS a
      LEFT JOIN CUSTOMER_CARE cc ON a.agentid=cc.agentid
      WHERE a.agentid IN (
        SELECT agentid FROM CUSTOMER_CARE
        GROUP BY agentid
        HAVING AVG(RESOLUTIONDATE-QUERYDATE) <=
          (SELECT AVG(RESOLUTIONDATE-QUERYDATE)
           FROM CUSTOMER_CARE)
      )
      GROUP BY a.agentid
    ) WHERE lowestOpenTickets=1;
  ELSE
    -- Low/Medium: assign to agent with fewest open tickets
    SELECT agentid INTO queryAgent
    FROM (
      SELECT a.agentid,
        COUNT(CASE WHEN status='Open' THEN 1 END) AS openTickets,
        row_number() OVER(ORDER BY
          COUNT(CASE WHEN status='Open' THEN 1 END)
        ) AS lowestOpenTickets
      FROM AGENTS a
      LEFT JOIN CUSTOMER_CARE cc ON a.agentid=cc.agentid
      GROUP BY a.agentid
    ) WHERE lowestOpenTickets=1;
  END IF;

  UPDATE CUSTOMER_CARE
  SET agentid = queryAgent
  WHERE custqueryid=p_custqueryid;
END;
/`,
}

const IMPL_STEPS = [
  { step: 'Database Creation', hours: 20 },
  { step: 'Data Insertion', hours: 10 },
  { step: 'Front-End Creation', hours: 40 },
  { step: 'Backend Development', hours: 30 },
  { step: 'Backend & Frontend Integration', hours: 20 },
  { step: 'Hosting on EC2', hours: 10 },
  { step: 'Training Employees', hours: 20 },
  { step: 'Testing', hours: 40 },
  { step: 'Maintenance', hours: 10 },
  { step: 'Potential Hurdles', hours: 40 },
]

const EXPENSES = [
  { item: 'Amazon EC2 — US West (Oregon)', amount: '$5,620', notes: 'Windows Server + SQL Server Standard; 1 EC2 instance' },
  { item: 'Storage (AWS EBS)', amount: '$1,980', notes: '1,650 GB Elastic Block Storage at $165/month × 12' },
  { item: 'Personnel', amount: '$48,000', notes: '$40/hr × 240 hrs; 5 database consultants' },
  { item: 'Oracle Database License', amount: '$17,500', notes: 'Standard Edition 2 Processor License' },
  { item: 'Oracle Support', amount: '$3,850', notes: 'Software Update + License Support' },
  { item: 'Additional Fees', amount: '$4,000', notes: 'Workspace, food, miscellaneous' },
]

const DDL_TABLES = [
  {
    name: 'AGENTS',
    sql: `CREATE TABLE AGENTS(
  agentID       varchar(10),
  agentFName    varchar(100) NOT NULL,
  agentLName    varchar(100) NOT NULL,
  contactNo     char(10),
  emailOfAgent  varchar(100) NOT NULL,
  numberOfTickets int DEFAULT 0,
  CONSTRAINT check_phone_agent
    CHECK (regexp_like(contactNo,'[0-9]{10}')),
  CONSTRAINT PK_Agent PRIMARY KEY (agentID)
);`,
  },
  {
    name: 'CUSTOMERS',
    sql: `CREATE TABLE CUSTOMERS(
  custID        varchar(10),
  fName         varchar(100) NOT NULL,
  lName         varchar(100) NOT NULL,
  phoneNo       char(10) NOT NULL,
  email         varchar(100) NOT NULL UNIQUE,
  password      varchar(20) NOT NULL,
  walletBalance number(8,2) DEFAULT 0,
  CONSTRAINT cust_pkey PRIMARY KEY(custID),
  CONSTRAINT check_phone_cust
    CHECK (regexp_like(phoneNo,'[0-9]{10}')),
  CONSTRAINT check_email_cust
    CHECK (email LIKE '%@%.%'),
  CONSTRAINT check_pwd_length
    CHECK (length(password)>=8)
);`,
  },
  {
    name: 'CUSTOMER_ADDRESS',
    sql: `CREATE TABLE CUSTOMER_ADDRESS(
  addressID      varchar(10),
  custID         varchar(10),
  city           varchar(100) NOT NULL,
  country        varchar(100) NOT NULL,
  defaultAddress char(3)      DEFAULT 'No',
  line1          varchar(100) NOT NULL,
  line2          varchar(100),
  state          char(2)      NOT NULL,
  tag            varchar(10),
  zipcode        char(5),
  CONSTRAINT cust_add_pkey PRIMARY KEY(addressID),
  CONSTRAINT cust_add_fkey
    FOREIGN KEY(custID) REFERENCES CUSTOMERS(custID)
    ON DELETE CASCADE,
  CONSTRAINT check_zip
    CHECK (regexp_like(zipcode,'[0-9]{5}'))
);`,
  },
  {
    name: 'CLUB_MEMBER',
    sql: `CREATE TABLE CLUB_MEMBER(
  custID               varchar(10),
  membershipStartDate  DATE,
  nextPaymentDueOn     DATE,
  CONSTRAINT PK_ClubMember PRIMARY KEY (custID),
  CONSTRAINT FK_PK_ClubMember
    FOREIGN KEY (custID) REFERENCES CUSTOMERS(custID)
    ON DELETE CASCADE
);`,
  },
  {
    name: 'HFCC',
    sql: `CREATE TABLE HFCC(
  limit        number(6)   NOT NULL,
  creditCardNo char(16),
  custID       varchar(10),
  CVV          char(3),
  validTill    DATE        NOT NULL,
  appliedOn    DATE        NOT NULL,
  CONSTRAINT creditcard_length CHECK (length(creditCardNo)=16),
  CONSTRAINT cvv_length        CHECK (length(CVV)=3),
  CONSTRAINT PK_HFCC PRIMARY KEY (creditCardNo),
  CONSTRAINT FK_HFCC
    FOREIGN KEY (custID) REFERENCES CUSTOMERS(custID)
    ON DELETE CASCADE
);`,
  },
  {
    name: 'DEPARTMENTS',
    sql: `CREATE TABLE DEPARTMENTS(
  deptID      varchar(10),
  category    varchar(100) NOT NULL,
  subCategory varchar(100) NOT NULL,
  CONSTRAINT PK_DEPT PRIMARY KEY (deptID),
  CONSTRAINT category_types CHECK (category IN (
    'Power Tools','Hand Tools','Automotive','Welding',
    'Plumbing','Electrical','Hardware','Material Handling',
    'Painting','Lighting','Safety','Home and Security',
    'Lawn and Garden','Air Tools','Generators'
  ))
);`,
  },
  {
    name: 'PRODUCTS',
    sql: `CREATE TABLE PRODUCTS(
  productID       varchar(10),
  productOverview varchar(1000) NOT NULL,
  pricePerUnit    FLOAT         NOT NULL,
  productName     varchar(100)  NOT NULL,
  returnPeriod    int           NOT NULL,
  reviewID        varchar(10),
  deptID          varchar(10),
  CONSTRAINT PK_PRODUCTS PRIMARY KEY (productID),
  CONSTRAINT FK_RID_PRODUCTS
    FOREIGN KEY (reviewID) REFERENCES REVIEW_DETAILS(reviewID)
    ON DELETE SET NULL,
  CONSTRAINT FK_DID_PRODUCTS
    FOREIGN KEY (deptID) REFERENCES DEPARTMENTS(deptID)
    ON DELETE SET NULL
);`,
  },
  {
    name: 'ITEMS',
    sql: `CREATE TABLE ITEMS(
  serialNumber      varchar(20),
  availability      char(3),
  manufacturingDate DATE,
  productID         varchar(10),
  storeID           varchar(10),
  CONSTRAINT check_isAvailable
    CHECK (availability IN ('Yes','No')),
  CONSTRAINT PK_ITEMS PRIMARY KEY (serialNumber),
  CONSTRAINT FK_ITEMS_PRODUCTS
    FOREIGN KEY (productID) REFERENCES PRODUCTS(productID)
    ON DELETE CASCADE,
  CONSTRAINT FK_ITEMS_STORES
    FOREIGN KEY (storeID) REFERENCES STORES(storeID)
    ON DELETE CASCADE
);`,
  },
  {
    name: 'DEALS',
    sql: `CREATE TABLE DEALS(
  dealID             varchar(10),
  dealDescription    varchar(100) NOT NULL,
  discountStartDate  DATE         NOT NULL,
  discountEndDate    DATE         NOT NULL,
  discountPercentage number(5,2)  NOT NULL,
  isMember           char(3),
  CONSTRAINT check_isMember CHECK (isMember IN ('Yes','No')),
  CONSTRAINT PK_Deals PRIMARY KEY (dealID)
);`,
  },
  {
    name: 'DEALS_ON_PRODUCTS',
    sql: `CREATE TABLE DEALS_ON_PRODUCTS(
  dealID    varchar(10),
  productID varchar(10),
  CONSTRAINT PK_DOP PRIMARY KEY (dealID, productID),
  CONSTRAINT FK_DOP_DEALS
    FOREIGN KEY (dealID) REFERENCES DEALS(dealID)
    ON DELETE SET NULL,
  CONSTRAINT FK_DOP_PRODUCTS
    FOREIGN KEY (productID) REFERENCES PRODUCTS(productID)
    ON DELETE SET NULL
);`,
  },
  {
    name: 'GIFT_CARDS',
    sql: `CREATE TABLE GIFT_CARDS(
  serialNumber varchar(20),
  giftCardCode char(16)    UNIQUE,
  amount       number(3)   NOT NULL,
  isActivated  char(3)     DEFAULT 'No',
  CONSTRAINT check_Activation
    CHECK (isActivated IN ('Yes','No')),
  CONSTRAINT check_giftcard_length
    CHECK (length(giftCardCode)=16),
  CONSTRAINT amount_types
    CHECK (amount IN ('25','50','75','100')),
  CONSTRAINT PK_GIFT_CARDS PRIMARY KEY (serialNumber),
  CONSTRAINT FK_GIFT_CARDS
    FOREIGN KEY (serialNumber) REFERENCES ITEMS(serialNumber)
    ON DELETE CASCADE
);`,
  },
  {
    name: 'GIFT_CARD_ACTIVATION',
    sql: `CREATE TABLE GIFT_CARD_ACTIVATION(
  serialNumber     varchar(20),
  custID           varchar(10),
  dateOfActivation DATE NOT NULL,
  CONSTRAINT PK_GIFT_CARDS_ACTIVATION
    PRIMARY KEY (serialNumber, custID),
  CONSTRAINT FK_GCA_GIFT_CARDS
    FOREIGN KEY (serialNumber) REFERENCES GIFT_CARDS(serialNumber)
    ON DELETE CASCADE,
  CONSTRAINT FK_GCA_CUSTOMERS
    FOREIGN KEY (custID) REFERENCES CUSTOMERS(custID)
    ON DELETE CASCADE
);`,
  },
  {
    name: 'COUPONS',
    sql: `CREATE TABLE COUPONS(
  couponCode        varchar(20),
  couponDescription varchar(100),
  couponValidity    DATE,
  discount          float,
  minCartValue      number(8,2),
  CONSTRAINT PK_CouponCode PRIMARY KEY (couponCode)
);`,
  },
  {
    name: 'SHIPPING_METHOD',
    sql: `CREATE TABLE SHIPPING_METHOD(
  shippingID    varchar(10),
  shippingPrice number(5,2) NOT NULL,
  shippingType  varchar(50) NOT NULL,
  daysToDeliver int,
  CONSTRAINT check_shippingType
    CHECK (shippingType IN ('Flat Rate','Express','Truck')),
  CONSTRAINT PK_SHIPPING_METHOD PRIMARY KEY (shippingID)
);`,
  },
  {
    name: 'ORDERS',
    sql: `CREATE TABLE ORDERS(
  orderID               varchar(50),
  orderDate             DATE         NOT NULL,
  orderStatus           varchar(20)  NOT NULL,
  shippingDate          DATE,
  estimatedDeliveryDate DATE         NOT NULL,
  actualDeliveryDate    DATE,
  paymentMode           varchar(20),
  couponDiscount        decimal(8,2),
  subtotal              decimal(8,2) NOT NULL,
  grandTotal            decimal(8,2) NOT NULL,
  couponID              varchar(20),
  custID                varchar(10),
  shippingID            varchar(10),
  CONSTRAINT PK_ORDERS PRIMARY KEY (orderID),
  CONSTRAINT FK_ORDERS_COUPONS
    FOREIGN KEY (couponID) REFERENCES COUPONS(couponID)
    ON DELETE SET NULL,
  CONSTRAINT FK_ORDERS_CUSTOMERS
    FOREIGN KEY (custID) REFERENCES CUSTOMERS(custID)
    ON DELETE CASCADE,
  CONSTRAINT FK_ORDERS_SHIPPING
    FOREIGN KEY (shippingID) REFERENCES SHIPPING_METHOD(shippingID)
    ON DELETE SET NULL
);`,
  },
  {
    name: 'ITEMS_IN_ORDERS',
    sql: `CREATE TABLE ITEMS_IN_ORDERS(
  orderID      varchar(50),
  serialNumber varchar(20),
  CONSTRAINT PK_ITEMS_ON_ORDERS
    PRIMARY KEY (orderID, serialNumber),
  CONSTRAINT FK_IOO_ORDERS
    FOREIGN KEY (orderID) REFERENCES ORDERS(orderID)
    ON DELETE CASCADE,
  CONSTRAINT FK_IOO_ITEMS
    FOREIGN KEY (serialNumber) REFERENCES ITEMS(serialNumber)
    ON DELETE SET NULL
);`,
  },
  {
    name: 'RETURNS',
    sql: `CREATE TABLE RETURNS(
  returnID        varchar(10),
  returnStatus    varchar(20) DEFAULT 'Initiated',
  reasonForReturn varchar(150) NOT NULL,
  requestDate     DATE         NOT NULL,
  returnedDate    DATE         NOT NULL,
  refundStatus    varchar(10) DEFAULT 'Initiated',
  serialNumber    varchar(20),
  orderID         varchar(20),
  CONSTRAINT check_returnstatus CHECK (returnStatus IN (
    'Initiated','In process','Completed','Declined','Cancelled'
  )),
  CONSTRAINT check_refundstatus CHECK (refundStatus IN (
    'Initiated','In process','Completed','Declined','Cancelled'
  )),
  CONSTRAINT PK_RETURNS PRIMARY KEY (returnID),
  CONSTRAINT FK_RETURNS_ORDERS
    FOREIGN KEY (orderID) REFERENCES ORDERS(orderID)
    ON DELETE SET NULL,
  CONSTRAINT FK_RETURNS_ITEMS
    FOREIGN KEY (serialNumber) REFERENCES ITEMS(serialNumber)
    ON DELETE SET NULL
);`,
  },
  {
    name: 'REVIEW_DETAILS',
    sql: `CREATE TABLE REVIEW_DETAILS(
  custID      varchar(10),
  description varchar(2000) NOT NULL,
  productID   varchar(10),
  ratings     int,
  reviewID    varchar(10),
  CONSTRAINT ratingsLimit CHECK (ratings BETWEEN 1 AND 5),
  CONSTRAINT PK_REVIEW_DETAILS PRIMARY KEY (reviewID),
  CONSTRAINT FK_RD_CUSTOMERS
    FOREIGN KEY (custID) REFERENCES CUSTOMERS(custID)
    ON DELETE CASCADE,
  CONSTRAINT FK_RD_PRODUCTS
    FOREIGN KEY (productID) REFERENCES PRODUCTS(productID)
    ON DELETE CASCADE
);`,
  },
  {
    name: 'STORES',
    sql: `CREATE TABLE STORES(
  addressLine1 varchar(100) NOT NULL,
  addressLine2 varchar(100),
  city         varchar(100) NOT NULL,
  phoneNo      char(10)     NOT NULL,
  state        char(2)      NOT NULL,
  storeID      varchar(10),
  zipcode      varchar(5)   NOT NULL,
  CONSTRAINT check_state2 CHECK (state IN (
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI',
    'ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI',
    'MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC',
    'ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
    'VT','VA','WA','WV','WI','WY'
  )),
  CONSTRAINT check_zip_stores
    CHECK (regexp_like(zipcode,'[0-9]{5}')),
  CONSTRAINT PK_STORES PRIMARY KEY (storeID)
);`,
  },
  {
    name: 'STORE_HOURS',
    sql: `CREATE TABLE STORE_HOURS(
  dayOfWeek varchar(20),
  openTime  TIMESTAMP WITH TIME ZONE NOT NULL,
  closeTime TIMESTAMP WITH TIME ZONE NOT NULL,
  storeID   varchar(10),
  CONSTRAINT PK_STORES_HOURS PRIMARY KEY (dayOfWeek, storeID),
  CONSTRAINT FK_STORES_HOURS
    FOREIGN KEY (storeID) REFERENCES STORES(storeID)
    ON DELETE CASCADE
);`,
  },
  {
    name: 'SERVICE_TYPES',
    sql: `CREATE TABLE SERVICE_TYPES(
  serviceID   varchar(10),
  serviceName varchar(100) NOT NULL,
  price       number(5,2)  NOT NULL,
  CONSTRAINT checkTypes CHECK (serviceName IN (
    'Repair','Routine Maintainance','Diagnostics',
    'Oiling','Replacement of Parts','Fabrication'
  )),
  CONSTRAINT PK_SERVICE_TYPES PRIMARY KEY (serviceID)
);`,
  },
  {
    name: 'SERVICE_PROFESSIONALS',
    sql: `CREATE TABLE SERVICE_PROFESSIONALS(
  professionalID varchar(10),
  fName          varchar(100) NOT NULL,
  lName          varchar(100) NOT NULL,
  contactNo      varchar(10),
  companyName    varchar(100) NOT NULL,
  CONSTRAINT check_phone_sp
    CHECK (regexp_like(contactNo,'[0-9]{10}')),
  CONSTRAINT PK_SERVICE_PROFESSIONALS PRIMARY KEY (professionalID)
);`,
  },
  {
    name: 'SERVICES',
    sql: `CREATE TABLE SERVICES(
  custID         varchar(10),
  professionalID varchar(10),
  serviceID      varchar(10),
  bookingID      varchar(10),
  bookingDate    DATE NOT NULL,
  completionDate DATE,
  CONSTRAINT PK_SERVICES PRIMARY KEY (bookingID),
  CONSTRAINT FK_SERVICES_CUSTOMERS
    FOREIGN KEY (custID) REFERENCES CUSTOMERS(custID)
    ON DELETE SET NULL,
  CONSTRAINT FK_SERVICES_SP
    FOREIGN KEY (professionalID)
    REFERENCES SERVICE_PROFESSIONALS(professionalID)
    ON DELETE SET NULL,
  CONSTRAINT FK_SERVICE_TYPES
    FOREIGN KEY (serviceID) REFERENCES SERVICE_TYPES(serviceID)
    ON DELETE SET NULL
);`,
  },
  {
    name: 'CUSTOMER_CARE',
    sql: `CREATE TABLE CUSTOMER_CARE(
  custQueryID  varchar(10),
  description  varchar(100),
  queryType    varchar(100),
  querySubType varchar(100),
  status       varchar(50) DEFAULT 'Open',
  custID       varchar(10),
  agentID      varchar(10),
  queryPriority varchar(10),
  queryDate    DATE,
  resolutionDate DATE,
  CONSTRAINT check_query CHECK (queryType IN (
    'Online experience','Store experience','Products','Services'
  )),
  CONSTRAINT check_querysub CHECK (querySubType IN (
    'Orders','Replacement','Account','Other','Refund'
  )),
  CONSTRAINT check_status CHECK (status IN ('Open','Close','Pending')),
  CONSTRAINT PK_CustomerCare PRIMARY KEY (custQueryID),
  CONSTRAINT FK_CC_CUSTOMERS
    FOREIGN KEY (custID) REFERENCES CUSTOMERS(custID)
    ON DELETE CASCADE,
  CONSTRAINT FK_CC_AGENTS
    FOREIGN KEY (agentID) REFERENCES AGENTS(agentID)
    ON DELETE SET NULL
);`,
  },
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
          Full-stack e-commerce implementation for Harbor Freight Tools — 22-table Oracle SQL
          schema with PHP frontend, hosted on Amazon EC2. Built by Team 200 OK, December 2022.
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

        {/* OVERVIEW */}
        <section className="doc-section">
          <div className="section-label"><span>// requirement analysis</span></div>
          <p className="doc-text">
            Harbor Freight is America's go-to store for low prices on tools and equipment. The company
            needed an e-commerce website to enable customers to buy products online, with two primary
            goals: improve the customer shopping experience and improve the customer support experience.
          </p>
          <p className="doc-text">
            The catalog covers over 4,000 products — air compressors, generators, wrenches, drills, saws,
            hand tools, tool storage, welding supplies, and automotive tools. Every product has a unique
            identifier, name, overview, unit price, and a return period. Each product can have multiple
            inventory units; each unit tracks a manufacturing date and availability. Products are stored
            exclusively in Harbor Freight's physical store locations — there are no separate warehouses.
          </p>
          <p className="doc-text">
            Each product belongs to a department with a category and sub-category (e.g. 'Hose' →
            'Lawn and Garden' → 'Garden Tools'). Customers register with name, email, phone, and
            password. They can save multiple addresses (home/work/other) and optionally join the Inside
            Track Club by paying a membership fee renewed annually.
          </p>
          <p className="doc-text">
            Orders capture placement date, shipping date, estimated and actual delivery dates, payment
            mode, and order total. Each order uses one of three shipping methods: Flat Rate, Express,
            or Truck — each with its own price and estimated delivery window. Customers may apply one
            coupon per order (single use per customer, shared across customers), and deals can be
            applied to products or entire categories, with optional member-only restriction.
          </p>
          <p className="doc-text">
            Harbor Freight also issues gift cards in $25/$50/$75/$100 denominations. A gift card can be
            purchased by one customer and gifted to another. Once activated, the amount is added to the
            recipient's wallet and the card is permanently locked. Customers can also enroll in a Harbor
            Freight credit card (HFCC) with a unique 16-digit number, CVV, credit limit, and validity date.
          </p>
          <p className="doc-text">
            Post-delivery, customers can review purchased products with 1–5 star ratings and a description.
            Each product-order combination can have at most one review. Returns are trackable with a
            reason, request date, return date, and separate statuses for return and refund. Customer
            support tickets are assigned to agents via a stored procedure that intelligently routes based
            on priority and agent workload.
          </p>
        </section>

        {/* TECH STACK */}
        <section className="doc-section">
          <div className="section-label"><span>// tech stack</span></div>
          <div className="doc-stack">
            <div className="stack-item">
              <div className="stack-label">Database</div>
              <div className="stack-value">Oracle SQL — DDL, DML, DCL; 22 tables, sequences, triggers, stored procedure</div>
            </div>
            <div className="stack-item">
              <div className="stack-label">Frontend</div>
              <div className="stack-value">PHP with OCI8 for Oracle connectivity; server-side rendered pages</div>
            </div>
            <div className="stack-item">
              <div className="stack-label">Hosting</div>
              <div className="stack-value">Amazon EC2 — US West (Oregon); Windows Server with SQL Server Standard</div>
            </div>
            <div className="stack-item">
              <div className="stack-label">Storage</div>
              <div className="stack-value">1,650 GB Amazon Elastic Block Storage (EBS) — sized for 66M visits/month at ~24 KB/visit</div>
            </div>
            <div className="stack-item">
              <div className="stack-label">Team</div>
              <div className="stack-value">Team 200 OK — Aishwarya Sasane, Anusha Raju, Maurvin Shah, Monisha Rahim, Varun Kapuria</div>
            </div>
          </div>
        </section>

        {/* DDL */}
        <section className="doc-section">
          <div className="section-label"><span>// DDL — table definitions</span></div>
          <p className="doc-text">
            All 22 tables use sequence-backed BEFORE INSERT triggers for primary key generation.
            Referential integrity is enforced with foreign key constraints; cascades and set-null
            rules are specified per relationship.
          </p>
          {DDL_TABLES.map(t => (
            <div key={t.name} className="doc-code-block">
              <div className="code-block-label">{t.name}</div>
              <pre className="doc-pre"><code>{t.sql}</code></pre>
            </div>
          ))}
        </section>

        {/* QUERIES */}
        <section className="doc-section">
          <div className="section-label"><span>// analytical queries</span></div>
          <p className="doc-text">
            Ten analytical queries power customer-facing features — product recommendations,
            deal discovery, return eligibility, savings summaries, and support metrics. All use
            CTEs and window functions (ROW_NUMBER, LEAD) for readability and performance.
          </p>
          {QUERIES.map((q, i) => (
            <div key={q.id} className="doc-query">
              <div className="query-header">
                <span className="query-num">Q{i + 1}</span>
                <span className="query-title">{q.title}</span>
              </div>
              <p className="doc-text">{q.desc}</p>
              <pre className="doc-pre"><code>{q.sql}</code></pre>
            </div>
          ))}
        </section>

        {/* TRIGGERS & PROCEDURE */}
        <section className="doc-section">
          <div className="section-label"><span>// triggers &amp; procedures</span></div>

          {TRIGGERS.map((t, i) => (
            <div key={t.id} className="doc-query">
              <div className="query-header">
                <span className="query-num">T{i + 1}</span>
                <span className="query-title">{t.title}</span>
              </div>
              <p className="doc-text">{t.desc}</p>
              <pre className="doc-pre"><code>{t.sql}</code></pre>
            </div>
          ))}

          <div className="doc-query">
            <div className="query-header">
              <span className="query-num">P1</span>
              <span className="query-title">{PROCEDURE.title}</span>
            </div>
            <p className="doc-text">{PROCEDURE.desc}</p>
            <pre className="doc-pre"><code>{PROCEDURE.sql}</code></pre>
          </div>
        </section>

        {/* PAGES */}
        <section className="doc-section">
          <div className="section-label"><span>// pages &amp; routes</span></div>
          <p className="doc-text">
            All pages connect to Oracle via <code className="doc-code">connection.php</code> and
            render dynamically based on the authenticated session. The live site was hosted at
            <code className="doc-code"> ec2-35-89-31-2.us-west-2.compute.amazonaws.com/harbour/</code>.
          </p>
          <div className="pages-list">
            {[
              { file: 'index.php', desc: 'Login and registration entry point' },
              { file: 'home.php', desc: 'Homepage — top seasonal products, best-selling deals, low stock alerts' },
              { file: 'products.php', desc: 'Product catalog — frequently purchased together, free delivery eligibility' },
              { file: 'shopping.php', desc: 'Shopping cart management' },
              { file: 'orders.php', desc: 'Order history and status tracking' },
              { file: 'account_details.php', desc: 'Customer profile — name, email, phone; displays total money saved' },
              { file: 'address_details.php', desc: 'Saved addresses CRUD — add, update, delete, set default' },
              { file: 'my_registration.php', desc: 'New account registration flow' },
              { file: 'frequently_purchased.php', desc: 'Personalized reorder suggestions (Query 1)' },
              { file: 'write_review.php', desc: 'Product review submission — star rating + description' },
              { file: 'my_queries.php', desc: 'Customer support ticket list — view, edit, delete queries' },
              { file: 'customer_care.php', desc: 'New query submission — routes via smart agent assignment procedure' },
              { file: 'gift_card.php', desc: 'Gift card activation — validates code, credits wallet, blocks reuse' },
              { file: 'returns.php', desc: 'Return request initiation for eligible delivered items' },
            ].map(p => (
              <div key={p.file} className="page-row">
                <span className="page-file">{p.file}</span>
                <span className="page-desc">{p.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* IMPLEMENTATION PLAN */}
        <section className="doc-section">
          <div className="section-label"><span>// implementation plan</span></div>
          <p className="doc-text">
            Harbor Freight averages ~30M visitors/month (1M/day). Assuming 2 pages/visit at 12 KB/page,
            each visitor consumes ~24 KB. At 66M visits/month (30M × 2 + 10% leeway) that requires
            ~1.58 TB of storage. The plan provisions 1,650 GB EBS on EC2 with auto-scaling to handle
            traffic spikes. Total project scope: 240 person-hours across 5 consultants.
          </p>

          <div className="doc-two-col">
            <div>
              <div className="schema-group-name" style={{ marginBottom: '8px' }}>Steps &amp; Hours</div>
              <div className="schema-table-list">
                {IMPL_STEPS.map(s => (
                  <div key={s.step} className="schema-row">
                    <span className="schema-table-name" style={{ fontSize: '12px', color: '#888', fontWeight: 400 }}>{s.step}</span>
                    <span className="schema-table-desc">{s.hours} hrs</span>
                  </div>
                ))}
                <div className="schema-row" style={{ borderTop: '1px solid #2a2a2a' }}>
                  <span className="schema-table-name">Total</span>
                  <span className="schema-table-desc" style={{ color: '#00ff88' }}>240 hrs</span>
                </div>
              </div>
            </div>

            <div>
              <div className="schema-group-name" style={{ marginBottom: '8px' }}>Expenses</div>
              <div className="schema-table-list">
                {EXPENSES.map(e => (
                  <div key={e.item} className="schema-row" style={{ gridTemplateColumns: '1fr auto' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '3px' }}>{e.item}</div>
                      <div style={{ fontSize: '11px', color: '#444' }}>{e.notes}</div>
                    </div>
                    <span className="schema-table-desc" style={{ whiteSpace: 'nowrap', paddingLeft: '16px' }}>{e.amount}</span>
                  </div>
                ))}
                <div className="schema-row" style={{ borderTop: '1px solid #2a2a2a', gridTemplateColumns: '1fr auto' }}>
                  <span className="schema-table-name">Total</span>
                  <span className="schema-table-desc" style={{ color: '#00ff88', paddingLeft: '16px' }}>$80,950</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REFERENCES */}
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
              Final ER Diagram.jpg — entity relationship diagram for the full 22-table schema ↗
            </a>
            <a
              href="https://github.com/varunkapuria96/Website-Implementation-with-SQL"
              target="_blank"
              rel="noreferrer"
              className="doc-ref-link"
            >
              GitHub Repository — PHP pages, SQL scripts, triggers, and procedures ↗
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
