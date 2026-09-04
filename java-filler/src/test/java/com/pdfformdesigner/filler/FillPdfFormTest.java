package com.pdfformdesigner.filler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FillPdfFormTest {
  @TempDir Path tempDir;

  @Test
  void fillsNamedAcroFormFieldsFromDesignerFixture() throws Exception {
    Path input = copyFixture();
    Path output = tempDir.resolve("filled.pdf");

    FillPdfForm.fill(
        input,
        output,
        Map.of(
            "customerName", "Ada Lovelace",
            "orderId", "42"));

    try (PDDocument document = Loader.loadPDF(output.toFile())) {
      PDAcroForm form = document.getDocumentCatalog().getAcroForm();
      assertEquals("Ada Lovelace", form.getField("customerName").getValueAsString());
      assertEquals("42", form.getField("orderId").getValueAsString());
    }
  }

  @Test
  void rejectsUnknownFieldNames() throws Exception {
    Path input = copyFixture();
    Path output = tempDir.resolve("missing.pdf");
    assertThrows(
        IllegalArgumentException.class,
        () -> FillPdfForm.fill(input, output, Map.of("notAField", "nope")));
  }

  private Path copyFixture() throws Exception {
    Path input = tempDir.resolve("sample-form.pdf");
    try (InputStream stream = FillPdfFormTest.class.getResourceAsStream("/sample-form.pdf")) {
      if (stream == null) {
        throw new IllegalStateException("Missing sample-form.pdf fixture. Run yarn generate-fixture.");
      }
      Files.copy(stream, input);
    }
    return input;
  }
}
