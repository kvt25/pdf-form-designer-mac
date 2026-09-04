# PDF Form Designer

A macOS app that opens a PDF, lets you draw named text fields on the page, and saves real AcroForm fields. A Java program can then fill those fields by name with Apache PDFBox.

Field names are the contract. Use `customerName`, not `Customer Name`. Letters, numbers, underscore, dot, and hyphen only, and each name must be unique.

## Run the app

```bash
yarn
yarn dev
```

Open a PDF, click **Add text field**, drag a rectangle, and name it in the inspector. Save. Re-open the file and the fields should still be there.

```bash
yarn build
```

That typechecks, bundles, and writes a `.app` / `.dmg` under `dist/`. The build is not notarized.

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

Pass `--flatten` on the CLI if you want the values burned into the page.

## Tests

```bash
yarn test
yarn test:java
```

`yarn test` writes fields with pdf-lib and reads them back. `yarn test:java` checks that PDFBox sees the same names and can set values.
