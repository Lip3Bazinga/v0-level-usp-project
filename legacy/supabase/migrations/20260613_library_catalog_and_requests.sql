-- ── Catálogo de bibliotecas aprovadas ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_catalog (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL UNIQUE,
  display_name  text NOT NULL,
  description   text,
  category      text NOT NULL DEFAULT 'general',
  pyodide_native boolean NOT NULL DEFAULT false,
  active        boolean NOT NULL DEFAULT true,
  added_by      uuid REFERENCES profiles(id),
  created_at    timestamptz DEFAULT now()
);

-- ── Requisições de novas bibliotecas (professor → admin) ──────────────────────
CREATE TABLE IF NOT EXISTS library_requests (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by  uuid NOT NULL REFERENCES profiles(id),
  library_name  text NOT NULL,
  display_name  text,
  description   text,
  use_case      text,
  status        text NOT NULL DEFAULT 'pending',
  reviewed_by   uuid REFERENCES profiles(id),
  review_notes  text,
  created_at    timestamptz DEFAULT now(),
  reviewed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_library_catalog_active    ON library_catalog(active);
CREATE INDEX IF NOT EXISTS idx_library_catalog_category  ON library_catalog(category);
CREATE INDEX IF NOT EXISTS idx_library_requests_status   ON library_requests(status);
CREATE INDEX IF NOT EXISTS idx_library_requests_user     ON library_requests(requested_by);

ALTER TABLE library_catalog  ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lib_catalog_public_read"   ON library_catalog FOR SELECT USING (true);
CREATE POLICY "lib_catalog_admin_write"   ON library_catalog FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "lib_requests_insert"       ON library_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin')));
CREATE POLICY "lib_requests_select"       ON library_requests FOR SELECT
  USING (requested_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "lib_requests_admin_update" ON library_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed do catálogo inicial
INSERT INTO library_catalog (name, display_name, description, category, pyodide_native) VALUES
  ('numpy',        'NumPy',         'Computação numérica com arrays multidimensionais',       'data-science',   true),
  ('pandas',       'Pandas',        'Manipulação e análise de dados em DataFrames',            'data-science',   true),
  ('scipy',        'SciPy',         'Algoritmos científicos: integração, otimização, sinal',  'data-science',   true),
  ('statsmodels',  'Statsmodels',   'Modelos estatísticos, testes e análise econométrica',    'data-science',   true),
  ('matplotlib',   'Matplotlib',    'Gráficos estáticos 2D e 3D de alta qualidade',           'visualization',  true),
  ('seaborn',      'Seaborn',       'Visualização estatística elegante sobre Matplotlib',     'visualization',  false),
  ('plotly',       'Plotly',        'Gráficos interativos e dashboards',                       'visualization',  false),
  ('imageio',      'ImageIO',       'Leitura e escrita de imagens e vídeos',                   'visualization',  true),
  ('scikit-learn', 'Scikit-learn',  'Algoritmos de ML: classificação, regressão, clustering', 'ml',             true),
  ('xgboost',      'XGBoost',       'Gradient boosting de alta performance',                   'ml',             true),
  ('lightgbm',     'LightGBM',      'Gradient boosting rápido e eficiente em memória',         'ml',             false),
  ('sympy',        'SymPy',         'Matemática simbólica: álgebra, cálculo, equações',       'math',           true),
  ('networkx',     'NetworkX',      'Criação e análise de grafos e redes complexas',           'math',           true),
  ('requests',     'Requests',      'HTTP requests simples e elegantes',                       'general',        false),
  ('beautifulsoup4','BeautifulSoup','Parsing de HTML/XML para web scraping',                   'general',        false),
  ('pillow',       'Pillow',        'Processamento de imagens (PIL fork)',                     'general',        true),
  ('lxml',         'lxml',          'Parser XML/HTML de alta performance',                     'general',        true),
  ('pyodide-http', 'Pyodide HTTP',  'Suporte a HTTP dentro do ambiente Pyodide',               'general',        true)
ON CONFLICT (name) DO NOTHING;
