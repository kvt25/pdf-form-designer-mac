package com.pdfformdesigner.filler;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDField;

public final class FillPdfForm {
  private FillPdfForm() {}

  public static void fill(Path input, Path output, Map<String, String> values) throws IOException {
    fill(input, output, values, false);
  }

  public static void fill(Path input, Path output, Map<String, String> values, boolean flatten)
      throws IOException {
    try (PDDocument document = Loader.loadPDF(input.toFile())) {
      PDAcroForm form = document.getDocumentCatalog().getAcroForm();
      if (form == null) {
        throw new IllegalStateException("PDF has no AcroForm");
      }
      form.setNeedAppearances(true);
      for (Map.Entry<String, String> entry : values.entrySet()) {
        PDField field = form.getField(entry.getKey());
        if (field == null) {
          throw new IllegalArgumentException("No field named \"" + entry.getKey() + "\"");
        }
        field.setValue(entry.getValue());
      }
      if (flatten) {
        form.flatten();
      }
      File parent = output.toFile().getParentFile();
      if (parent != null) {
        parent.mkdirs();
      }
      document.save(output.toFile());
    }
  }

  public static void main(String[] args) throws Exception {
    boolean flatten = false;
    List<String> rest = new ArrayList<>();
    for (String arg : args) {
      if ("--flatten".equals(arg)) {
        flatten = true;
      } else {
        rest.add(arg);
      }
    }
    if (rest.size() < 2) {
      System.err.println("Usage: FillPdfForm [--flatten] <in.pdf> <out.pdf> [name=value ...]");
      System.exit(2);
      return;
    }
    Map<String, String> values = new LinkedHashMap<>();
    for (int i = 2; i < rest.size(); i++) {
      String pair = rest.get(i);
      int eq = pair.indexOf('=');
      if (eq <= 0) {
        System.err.println("Expected name=value, got: " + pair);
        System.exit(2);
        return;
      }
      values.put(pair.substring(0, eq), pair.substring(eq + 1));
    }
    fill(Path.of(rest.get(0)), Path.of(rest.get(1)), values, flatten);
  }
}
