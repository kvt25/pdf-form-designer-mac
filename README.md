# PDF Form Designer

A desktop app that opens a PDF, lets you draw named form fields on the page, and saves real AcroForm fields. A Java program can then fill those fields by name with Apache PDFBox.

Field names are the contract. Use `customerName`, not `Customer Name`. Letters, numbers, underscore, dot, and hyphen only, and each name must be unique (radio-button options share one group name).

## Design fields

Open a PDF, pick a tool on the left rail (or press `V` `T` `C` `R` `D` `L` `B`), drag a rectangle, and configure it in the floating inspector. Save. Re-open the file and the fields should still be there.

Supported field types: text (single and multiline), checkbox, radio-button group, dropdown, list box, and push button — plus required, read-only, max length, choice options, default values, and border/fill colors. Existing third-party form controls open as editable fields.

## Build from source

Prerequisites:

- Node.js 20 LTS or newer (developed with Node 22+)
- Yarn Classic (`yarn --version` should print `1.x`). Use Yarn, not npm.
- Java 17 or newer, only for the `java-filler/` helper. The Gradle wrapper (`./gradlew`) downloads its own distribution on first run.

```bash
git clone https://github.com/<owner>/pdf-form-designer.git
cd pdf-form-designer
yarn
yarn dev
```

That starts the app with hot reload. Useful scripts:

| Command            | What it does                                                        |
| ------------------ | ------------------------------------------------------------------- |
| `yarn dev`         | Run the app in development mode                                     |
| `yarn build`       | Typecheck, bundle, and write a macOS arm64 `.app` / `.dmg` to `dist/` |
| `yarn build:unpack`| Same, but an unpacked `.app` folder (faster, no disk image)        |
| `yarn test`        | Node round-trip tests: write fields, read them back                 |
| `yarn test:java`   | Regenerate the fixture and run the PDFBox tests in `java-filler/`   |
| `yarn lint`        | ESLint (run `yarn format` first to auto-fix style)                  |
| `yarn typecheck`   | Strict TypeScript checks for the main and renderer processes        |

The macOS build is ad-hoc signed, not notarized, so macOS Gatekeeper may ask for confirmation on first launch of a downloaded `.dmg`.

### Troubleshooting

- `yarn dev` fails with `Error: Electron uninstall`: the Electron binary was not downloaded during `yarn install`. Repair it with `node node_modules/electron/install.js` (needs network), then run `yarn dev` again.
- `./gradlew` tries to re-download Gradle or dependencies: it needs network access on first run. Behind a proxy, set `GRADLE_USER_HOME` to your real Gradle home (e.g. `~/.gradle`) so the wrapper reuses the cached distribution and modules, or install the matching Gradle from https://gradle.org/install/ and run `gradle` instead of `./gradlew`.
- `yarn test:java` needs the fixture first; the script runs `yarn generate-fixture` for you.

## Fill fields from Java

The `java-filler/` project is a small PDFBox 3 wrapper plus a round-trip test against a fixture produced by the same writer the app uses.

```bash
yarn generate-fixture
cd java-filler
./gradlew test
./gradlew jar
java -jar build/libs/pdf-form-filler-1.0.0.jar form.pdf filled.pdf customerName="Ada Lovelace" orderId=42
```

In your own app:

```java
try (PDDocument document = Loader.loadPDF(new File("form.pdf"))) {
    PDAcroForm form = document.getDocumentCatalog().getAcroForm();
    form.getField("customerName").setValue("Ada Lovelace");
    form.getField("orderId").setValue("42");
    document.save("filled.pdf");
}
```

Checkboxes take their export value (`Yes` for boxes drawn in this app), radio groups take the selected option value, and dropdowns/list boxes take one of their options. Pass `--flatten` on the CLI if you want the values burned into the page (PDFBox prints a `NeedAppearances` warning when flattening; the output is still correct).

## Tests

```bash
yarn test
yarn test:java
```

`yarn test` writes every field type with pdf-lib and reads them back, including appearance-stream checks so filled values never render blank. `yarn test:java` checks that PDFBox sees the same names and can set values.
