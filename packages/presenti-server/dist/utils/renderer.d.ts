/** Helper functions when creating Presenti-compatible structures */
export declare namespace PresentiKit {
    /**
     * Generates a color palette for the given image URL
     * @param imageURL image URL to generate for
     */
    function generatePalette(imageURL: string): Promise<string[]>;
}
