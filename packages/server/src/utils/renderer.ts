import got from "got";
import splashy from "splashy";

/** Helper functions when creating Presenti-compatible structures */
export namespace PresentiKit {
  /**
   * Returns the base64 components of a string, or null if it is not a base64 string
   * @param data data to analyze
   */
  function testBase64(data: string) {
    const reg = /^data:image\/([\w+]+);base64,([\s\S]+)/;
    const match = data.match(reg);
  
    if (!match) {
      return null;
    }
  
    return Buffer.from(match[2], "base64");
  }

  /**
   * Generates a color palette for the given image URL
   * @param imageURL image URL to generate for
   */
  export async function generatePalette(imageURL: string): Promise<string[]> {
    const body = testBase64(imageURL) || await got(imageURL).buffer();
    const palette = await splashy(body);
    return palette;
  }
}