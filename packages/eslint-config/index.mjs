// Regras de lint únicas do monorepo. Cada pacote importa `createTypeScriptConfig` no seu
// eslint.config.mjs; nenhuma regra deve ser redefinida localmente (só arquivos e ignores),
// para que os pacotes não divirjam.
//
// O `typescript-eslint` é recebido por parâmetro (e não importado aqui) porque a web já o
// registra pelo eslint-config-next: o ESLint recusa dois objetos de plugin com o mesmo nome,
// então cada pacote passa a sua própria instância.
import jsdoc from "eslint-plugin-jsdoc"

/** Extensões TypeScript verificadas com informação de tipos. */
export const TYPESCRIPT_FILES = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]

/** Arquivos de configuração em JavaScript: lint sem tipos. */
export const JAVASCRIPT_FILES = ["**/*.js", "**/*.mjs", "**/*.cjs"]

/** Regras com tipos aplicadas a todo arquivo TypeScript do monorepo (todas como erro). */
export const TYPED_RULES = {
  // Tipos e contratos explícitos
  "@typescript-eslint/explicit-function-return-type": [
    "error",
    {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
      allowHigherOrderFunctions: true,
      allowIIFEs: true,
    },
  ],
  "@typescript-eslint/explicit-module-boundary-types": "error",
  "@typescript-eslint/explicit-member-accessibility": ["error", { accessibility: "no-public" }],
  "@typescript-eslint/consistent-type-imports": [
    "error",
    { prefer: "type-imports", fixStyle: "separate-type-imports" },
  ],
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/no-unnecessary-type-assertion": "error",
  "@typescript-eslint/switch-exhaustiveness-check": [
    "error",
    { considerDefaultExhaustiveForUnions: true },
  ],

  // Promessas
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/no-misused-promises": "error",
  "@typescript-eslint/await-thenable": "error",
  "@typescript-eslint/require-await": "error",
  "@typescript-eslint/return-await": ["error", "in-try-catch"],

  // Valores `any` vindos de bibliotecas ou de JSON não se espalham pelo código
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-unsafe-return": "error",

  // Condições e fallbacks coerentes com os tipos
  "@typescript-eslint/no-unnecessary-condition": "error",
  // `||` entre booleanos é OU lógico, não fallback. Para texto em que "" conta como ausente,
  // use `nonEmpty(texto) ?? padrão` (@levelusp/contracts) e deixe a intenção explícita.
  "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: { boolean: true } }],

  // Higiene
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/no-unused-expressions": "error",
  "no-console": "error",
  "no-fallthrough": "error",
}

/**
 * Regras de React somadas ao preset do Next (que já traz `react-hooks/*` do React Compiler).
 * Todas como erro: o preset deixa duas delas como aviso.
 */
export const REACT_RULES = {
  // useAsyncResource recebe um array de dependências como o useEffect.
  "react-hooks/exhaustive-deps": ["error", { additionalHooks: "useAsyncResource" }],
  "react-hooks/incompatible-library": "error",
  "react-hooks/unsupported-syntax": "error",
}

/**
 * Exige TSDoc em toda declaração exportada (funções, classes, métodos não privados,
 * interfaces, aliases de tipo e enums) dos arquivos indicados.
 */
export const DOCUMENTATION_RULES = {
  "jsdoc/require-jsdoc": [
    "error",
    {
      publicOnly: true,
      checkConstructors: false,
      require: {
        FunctionDeclaration: true,
        ClassDeclaration: true,
        ArrowFunctionExpression: true,
        FunctionExpression: true,
        MethodDefinition: false,
      },
      contexts: [
        "TSInterfaceDeclaration",
        "TSTypeAliasDeclaration",
        "TSEnumDeclaration",
        "ClassBody > MethodDefinition[accessibility!='private'][accessibility!='protected'][kind!='constructor']",
      ],
    },
  ],
  "jsdoc/require-description": ["error", { contexts: ["any"] }],
  "jsdoc/no-blank-blocks": "error",
  "jsdoc/no-types": "error",
  "jsdoc/check-param-names": ["error", { checkDestructured: false }],
  "jsdoc/check-tag-names": ["error", { typed: true }],
}

/**
 * Monta a configuração completa de um pacote.
 *
 * @param options.tseslint Instância do `typescript-eslint` do próprio pacote.
 * @param options.tsconfigRootDir Diretório do pacote (`import.meta.dirname`).
 * @param options.documented Camadas que exigem TSDoc nas exportações (`files`) e exceções (`ignores`).
 * @param options.allowDefaultProject Arquivos TS fora do tsconfig (configs) que ainda recebem lint tipado.
 * @param options.ignores Globs ignorados além de `dist/` e `coverage/`.
 * @param options.cliScripts Scripts de linha de comando, cuja saída é o próprio console.
 */
export function createTypeScriptConfig({
  tseslint,
  tsconfigRootDir,
  documented = { files: [], ignores: [] },
  allowDefaultProject = [],
  ignores = [],
  cliScripts = [],
}) {
  const documentedIgnores = ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", ...(documented.ignores ?? [])]
  return [
    { ignores: ["dist/**", "coverage/**", ...ignores] },
    ...tseslint.configs.recommended,
    {
      files: TYPESCRIPT_FILES,
      languageOptions: {
        parserOptions: {
          projectService: { allowDefaultProject },
          tsconfigRootDir,
        },
      },
      rules: TYPED_RULES,
    },
    {
      files: documented.files,
      ignores: documentedIgnores,
      plugins: { jsdoc },
      settings: { jsdoc: { mode: "typescript" } },
      rules: DOCUMENTATION_RULES,
    },
    {
      files: JAVASCRIPT_FILES,
      ...tseslint.configs.disableTypeChecked,
    },
    ...(cliScripts.length > 0 ? [{ files: cliScripts, rules: { "no-console": "off" } }] : []),
  ]
}
