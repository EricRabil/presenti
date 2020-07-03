import { expect } from "chai";
import { PresenceStruct, PresenceText } from "@presenti/utils";
import { DynamicTransformation, TransformationType, applyTransformations, PropertyTransformation } from "../../src/utils/transformation";

interface ObjectPresenceText {
  text: string;
}

const ORIGINAL = "ORIGINAL";
const UNORIGINAL = "UNORIGINAL";
const UNAFFECTED = "UNAFFECTED";

describe('Transformations API', async function() {
  describe('SET Transformations', function() {
    it('should transform dynamics', function() {
      const presence: PresenceStruct = {
        title: {
          text: ORIGINAL
        },
        largeText: {
          text: UNAFFECTED
        }
      };

      const rule: DynamicTransformation = {
        type: TransformationType.SET,
        match: ORIGINAL,
        value: UNORIGINAL
      };
      
      const transformed = applyTransformations([ presence ], [ rule ])[0]!;
      const { text } = transformed.title as ObjectPresenceText;
      const { text: unaffectedText } = transformed.largeText as ObjectPresenceText;

      /** values that match the rule should be modified */
      expect(text).to.equal(UNORIGINAL);
      /** values that do not match the rule should not be modified */
      expect(unaffectedText).to.equal(UNAFFECTED);
    });

    it('should transform property transformations', function() {
      const presence: PresenceStruct = {
        title: {
          text: ORIGINAL
        },
        largeText: {
          text: ORIGINAL
        }
      };

      const rule: PropertyTransformation ={
        type: TransformationType.SET,
        match: ORIGINAL,
        value: UNORIGINAL,
        property: "title"
      };

      const transformed = applyTransformations([ presence ], [ rule ])[0]!;
      const { text } = transformed.title as ObjectPresenceText;
      const { text: unaffectedText } = transformed.largeText as ObjectPresenceText;

      /** only the title property should be modified */
      expect(text).to.equal(UNORIGINAL);
      /** the largeText property should not be modified even though it matches */
      expect(unaffectedText).to.equal(ORIGINAL);
    });

    it('should not transform property transformations when they do not match', function() {
      const presence: PresenceStruct = {
        title: {
          text: UNAFFECTED
        },
        largeText: {
          text: ORIGINAL
        }
      };

      const rule: PropertyTransformation = {
        type: TransformationType.SET,
        match: ORIGINAL,
        value: UNORIGINAL,
        property: "title"
      };

      const transformed = applyTransformations([ presence ], [ rule ])[0]!;
      const { text } = (transformed.title || {}) as ObjectPresenceText;
      const { text: unaffectedText } = transformed.largeText as ObjectPresenceText;

      expect(text).to.equal(UNAFFECTED);
      expect(unaffectedText).to.equal(ORIGINAL);
    });

    it('should transform properties unconditionally when no match is provided', function() {
      const presence: PresenceStruct = {
        title: {
          text: ORIGINAL
        },
        largeText: {
          text: ORIGINAL
        }
      };

      const rule: PropertyTransformation = {
        type: TransformationType.SET,
        value: UNORIGINAL,
        property: "title"
      };

      const transformed = applyTransformations([ presence ], [ rule ])[0]!;
      const { text } = transformed.title as ObjectPresenceText;
      const { text: unaffectedText } = transformed.largeText as ObjectPresenceText;

      expect(text).to.equal(UNORIGINAL);
      expect(unaffectedText).to.equal(ORIGINAL);
    });
  });

  describe('REPLACE Transformations', function() {
    const MIXED_ORIGINAL = `bitch ${ORIGINAL} die`;
    const MIXED_UNAFFECTED = `bitch ${UNAFFECTED} die`;
    const MIXED_UNORIGINAL = `bitch ${UNORIGINAL} die`;

    it('should transform dynamics', function() {
      const presence: PresenceStruct = {
        title: {
          text: MIXED_ORIGINAL
        },
        largeText: {
          text: MIXED_UNAFFECTED
        }
      };

      const rule: DynamicTransformation = {
        type: TransformationType.REPLACE,
        match: ORIGINAL,
        value: UNORIGINAL
      };

      const transformed = applyTransformations([ presence ], [ rule ])[0]!;
      const { text } = transformed.title as ObjectPresenceText;
      const { text: unaffectedText } = transformed.largeText as ObjectPresenceText;

      /** values that match the rule should be modified */
      expect(text).to.equal(MIXED_UNORIGINAL);
      /** values that do not match the rule should not be modified */
      expect(unaffectedText).to.equal(MIXED_UNAFFECTED);
    });

    it('should transform property transformations', function() {
      const presence: PresenceStruct = {
        title: {
          text: MIXED_ORIGINAL
        },
        largeText: {
          text: MIXED_ORIGINAL
        }
      };

      const rule: PropertyTransformation = {
        type: TransformationType.REPLACE,
        match: ORIGINAL,
        value: UNORIGINAL,
        property: "title"
      };

      const transformed = applyTransformations([ presence ], [ rule ])[0]!;
      const { text } = transformed.title as ObjectPresenceText;
      const { text: unaffectedText } = transformed.largeText as ObjectPresenceText;

      /** only the title property should be modified */
      expect(text).to.equal(MIXED_UNORIGINAL);
      /** the largeText property should not be modified even though it matches */
      expect(unaffectedText).to.equal(MIXED_ORIGINAL);
    });

    it('should not transform property transformations when they do not match', function() {
      const presence: PresenceStruct = {
        title: {
          text: MIXED_UNAFFECTED
        },
        largeText: {
          text: MIXED_UNAFFECTED
        }
      };

      const rule: PropertyTransformation = {
        type: TransformationType.REPLACE,
        match: ORIGINAL,
        value: UNORIGINAL,
        property: "title"
      };

      const transformed = applyTransformations([ presence ], [ rule ])[0]!;
      const { text } = (transformed.title || {}) as ObjectPresenceText;
      const { text: unaffectedText } = transformed.largeText as ObjectPresenceText;

      expect(text).to.equal(MIXED_UNAFFECTED);
      expect(unaffectedText).to.equal(MIXED_UNAFFECTED);
    });

    it('should transform properties unconditionally when no match is provided', function() {
      const presence: PresenceStruct = {
        title: {
          text: MIXED_ORIGINAL
        },
        largeText: {
          text: MIXED_ORIGINAL
        }
      };

      const rule: PropertyTransformation = {
        type: TransformationType.REPLACE,
        value: MIXED_UNORIGINAL,
        property: "title"
      };

      const transformed = applyTransformations([ presence ], [ rule ])[0]!;
      const { text } = transformed.title as ObjectPresenceText;
      const { text: unaffectedText } = transformed.largeText as ObjectPresenceText;

      expect(text).to.equal(MIXED_UNORIGINAL);
      expect(unaffectedText).to.equal(MIXED_ORIGINAL);
    });
  });

  describe('DELETE Transformations', function() {
    it('should transform dynamics', function() {
      const presence: PresenceStruct = {
        title: {
          text: ORIGINAL
        },
        largeText: {
          text: UNAFFECTED
        }
      };

      const rule: DynamicTransformation = {
        type: TransformationType.DELETE,
        match: ORIGINAL
      };

      const transformed = applyTransformations([ presence ], [ rule ])[0]!;
      const title = transformed.title as ObjectPresenceText;
      const { text: unaffectedText } = transformed.largeText as ObjectPresenceText;

      expect(title).to.equal(null);
      expect(unaffectedText).to.equal(UNAFFECTED);
    });

    it('should transform property transformations', function() {
      const presence: PresenceStruct = {
        title: {
          text: ORIGINAL
        },
        largeText: {
          text: ORIGINAL
        }
      };

      const rule: PropertyTransformation = {
        type: TransformationType.DELETE,
        match: ORIGINAL,
        property: "title"
      };

      const transformed = applyTransformations([ presence ], [ rule ])[0]!;
      const title = transformed.title as ObjectPresenceText;
      const { text: unaffectedText } = transformed.largeText as ObjectPresenceText;

      expect(title).to.equal(null);
      expect(unaffectedText).to.equal(ORIGINAL);
    });

    it('should not transform property transformations when they do not match', function() {
      const presence: PresenceStruct = {
        title: {
          text: UNAFFECTED
        },
        largeText: {
          text: ORIGINAL
        }
      };

      const rule: PropertyTransformation = {
        type: TransformationType.DELETE,
        match: ORIGINAL,
        property: "title"
      };

      const transformed = applyTransformations([ presence ], [ rule ])[0]!;
      const { text } = (transformed.title || {}) as ObjectPresenceText;
      const { text: unaffectedText } = transformed.largeText as ObjectPresenceText;

      expect(text).to.equal(UNAFFECTED);
      expect(unaffectedText).to.equal(ORIGINAL);
    });

    it('should transform properties unconditionally when no match is provided', function() {
      const presence: PresenceStruct = {
        title: {
          text: ORIGINAL
        },
        largeText: {
          text: ORIGINAL
        }
      };

      const rule: PropertyTransformation = {
        type: TransformationType.DELETE,
        property: "title"
      };

      const transformed = applyTransformations([ presence ], [ rule ])[0]!;
      const title = transformed.title as ObjectPresenceText;
      const { text: unaffectedText } = transformed.largeText as ObjectPresenceText;

      expect(title).to.equal(null);
      expect(unaffectedText).to.equal(ORIGINAL);
    });
  });
});