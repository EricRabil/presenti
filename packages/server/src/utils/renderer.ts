import got from "got";
import splashy from "splashy";

/** Helper functions when creating Presenti-compatible structures */
export namespace PresentiKit {
  /**
   * Generates a color palette for the given image URL
   * @param imageURL image URL to generate for
   */
  export async function generatePalette(imageURL: string): Promise<string[]> {
    const body = await got(imageURL).buffer();
    const palette = await splashy(body);
    return palette;
  }
}