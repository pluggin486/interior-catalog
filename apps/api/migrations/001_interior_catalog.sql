CREATE TABLE materials (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  color text NOT NULL,
  description text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_per_m2 numeric(12,2) NOT NULL CHECK (price_per_m2 > 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE categories (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE products (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  category_id integer NOT NULL REFERENCES categories(id),
  material_id integer NOT NULL REFERENCES materials(id),
  price_from numeric(12,2) NOT NULL CHECK (price_from > 0),
  price_to numeric(12,2) NOT NULL CHECK (price_to >= price_from),
  width_cm integer NOT NULL CHECK (width_cm > 0),
  height_cm integer NOT NULL CHECK (height_cm > 0),
  depth_cm integer NOT NULL CHECK (depth_cm > 0),
  image_tone text NOT NULL DEFAULT 'sand',
  features text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX products_public_order_idx ON products(is_active, sort_order, id);

CREATE TABLE services (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE inquiries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id uuid NOT NULL UNIQUE,
  idempotency_key varchar(128) NOT NULL UNIQUE,
  source text NOT NULL CHECK (source IN ('catalog', 'calculator', 'comparison')),
  contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 2 AND 120),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 40),
  email text CHECK (email IS NULL OR char_length(email) <= 200),
  product_slug text REFERENCES products(slug),
  material_slug text REFERENCES materials(slug),
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  service_slugs text[] NOT NULL DEFAULT '{}',
  comment text CHECK (comment IS NULL OR char_length(comment) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inquiries_created_at_idx ON inquiries(created_at DESC);

INSERT INTO materials (slug, name, color, description, properties, price_per_m2, sort_order) VALUES
('oak-solid', 'Массив дуба', '#8a5b35', 'Тёплая выразительная текстура для фасадов и предметов с характером.', '{"Износостойкость":"Высокая","Отделка":"Масло или лак","Применение":"Фасады, столешницы"}', 68000, 1),
('mdf-enamel', 'МДФ, эмаль', '#b9a28e', 'Ровная поверхность с широкой палитрой оттенков и спокойным рисунком.', '{"Износостойкость":"Высокая","Отделка":"Матовая или глянцевая эмаль","Применение":"Кухни, шкафы"}', 42000, 2),
('natural-veneer', 'Натуральный шпон', '#b17a4b', 'Сохраняет природный рисунок дерева при стабильной основе.', '{"Износостойкость":"Средняя","Отделка":"Защитный лак","Применение":"Панели, фасады"}', 51000, 3),
('birch-plywood', 'Берёзовая фанера', '#d1b38a', 'Лёгкий материал с открытой кромкой для лаконичных решений.', '{"Износостойкость":"Средняя","Отделка":"Масло или прозрачный лак","Применение":"Полки, столы"}', 31000, 4);

INSERT INTO categories (slug, name, sort_order) VALUES
('kitchens', 'Кухни', 1), ('wardrobes', 'Шкафы и гардеробные', 2), ('tables', 'Столы и рабочие зоны', 3), ('shelving', 'Полки и системы хранения', 4);

INSERT INTO products (slug, title, description, category_id, material_id, price_from, price_to, width_cm, height_cm, depth_cm, image_tone, features, sort_order) VALUES
('kitchen-linea', 'Кухня «Линия»', 'Спокойная композиция с ровными фасадами и продуманными зонами хранения.', 1, 2, 185000, 310000, 240, 220, 60, 'clay', ARRAY['Индивидуальная ширина секций','Скрытая фурнитура','Выбор оттенка'], 1),
('kitchen-sfera', 'Кухня «Сфера»', 'Тёплая кухня с акцентом на натуральный шпон и мягкие линии.', 1, 3, 220000, 365000, 280, 230, 62, 'wood', ARRAY['Шпон с подбором рисунка','Встроенное освещение','Мягкое закрывание'], 2),
('kitchen-runa', 'Кухня «Руна»', 'Компактный угловой гарнитур для небольшого пространства.', 1, 4, 138000, 244000, 190, 215, 58, 'sand', ARRAY['Угловая конфигурация','Компактная глубина','Встроенные органайзеры'], 3),
('wardrobe-nord', 'Шкаф «Норд»', 'Встроенная система хранения с лаконичными фасадами.', 2, 2, 96000, 178000, 180, 240, 60, 'clay', ARRAY['Наполнение по задаче','Раздвижные двери','До потолка'], 4),
('wardrobe-wood', 'Гардеробная «Такт»', 'Открытая система хранения с деревянными полками и мягким светом.', 2, 1, 122000, 205000, 220, 235, 55, 'wood', ARRAY['Регулируемые полки','Открытые секции','Световые сценарии'], 5),
('wardrobe-arc', 'Шкаф «Арка»', 'Шкаф с округлёнными фасадами для мягкого акцента в интерьере.', 2, 3, 118000, 198000, 160, 225, 58, 'sand', ARRAY['Радиусные фасады','Натуральный рисунок','Тихая фурнитура'], 6),
('table-forma', 'Стол «Форма»', 'Рабочий стол с массивной дубовой столешницей и тонким основанием.', 3, 1, 54000, 89000, 140, 75, 70, 'wood', ARRAY['Массив дуба','Скруглённые кромки','Два варианта опоры'], 7),
('table-ray', 'Стол «Луч»', 'Лёгкий письменный стол с открытой фанерной кромкой.', 3, 3, 36000, 62000, 120, 74, 60, 'sand', ARRAY['Берёзовая фанера','Кабельный канал','Компактный размер'], 8),
('table-mosaic', 'Стол «Мозаика»', 'Стол для семейных встреч с выразительной шпонированной столешницей.', 3, 2, 72000, 118000, 180, 76, 90, 'clay', ARRAY['Натуральный шпон','Раскладная версия','Защитное покрытие'], 9),
('shelf-rail', 'Система «Рельс»', 'Модульные полки, которые можно переставлять под меняющиеся задачи.', 4, 3, 28000, 64000, 160, 200, 32, 'sand', ARRAY['Модульная сборка','Открытая кромка','Настенный монтаж'], 10),
('shelf-grid', 'Стеллаж «Сетка»', 'Открытый стеллаж с ритмом ячеек и несколькими вариантами отделки.', 4, 1, 42000, 78000, 120, 190, 35, 'wood', ARRAY['Настраиваемая сетка','Усиленные полки','Выбор цвета'], 11),
('shelf-soft', 'Полки «Тихо»', 'Набор лаконичных полок для книг и небольших предметов.', 4, 1, 18000, 38000, 100, 90, 28, 'clay', ARRAY['Массив дуба','Скрытый крепёж','Комплект из трёх полок'], 12);

INSERT INTO services (slug, name, description, price, sort_order) VALUES
('measurement', 'Замер помещения', 'Снимем размеры и проверим особенности пространства.', 4500, 1),
('design', 'Проектирование', 'Подготовим планировку и визуальную концепцию.', 12000, 2),
('delivery', 'Доставка', 'Демонстрационный тариф доставки по городу.', 7000, 3),
('installation', 'Монтаж', 'Соберём и установим изделие на месте.', 15000, 4);
