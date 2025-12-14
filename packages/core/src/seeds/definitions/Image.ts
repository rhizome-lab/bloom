// oxlint-disable-next-line no-unassigned-import
import "../../generated_types";
import { EntityBase } from "./EntityBase";

/**
 * ImageEntity - Represents a generated or imported image stored as a viwo entity
 *
 * Properties:
 * - name: Display name of the image
 * - image: Base64-encoded image data (data URL format)
 * - metadata: JSON string containing generation parameters
 * - image_type: Type of image ("generated", "edited", "upscaled", etc.)
 */
export class ImageEntity extends EntityBase {
  /**
   * View image information
   * Displays the image name, type, and metadata
   */
  view() {
    const imageType = (this.image_type as string) ?? "unknown";
    send("message", `Image: ${this.name} (${imageType})`);

    if (this.metadata) {
      const metadataStr = this.metadata as string;
      send("message", `Metadata: ${metadataStr}`);
    }
  }

  /**
   * Get the base64 image data
   * Returns the image data URL for display or download
   */
  get_data() {
    return this.image;
  }

  /**
   * Get parsed metadata object
   * Returns the metadata as a parsed object
   */
  get_metadata() {
    if (!this.metadata) {
      return {};
    }

    try {
      const metadataStr = this.metadata as string;
      return JSON.parse(metadataStr);
    } catch {
      return {};
    }
  }

  /**
   * Update image data
   * Allows updating the image with new base64 data
   */
  update_image(newImageData: string) {
    const cap = get_capability("entity.control", { target_id: this.id });
    if (!cap) {
      send("message", "No permission to update image");
      return;
    }

    std.call_method(cap, "update", this.id, { image: newImageData });
    send("message", "Image updated successfully");
  }

  /**
   * Update metadata
   * Allows updating the metadata JSON
   */
  update_metadata(newMetadata: Record<string, unknown>) {
    const cap = get_capability("entity.control", { target_id: this.id });
    if (!cap) {
      send("message", "No permission to update metadata");
      return;
    }

    std.call_method(cap, "update", this.id, {
      metadata: JSON.stringify(newMetadata),
    });
    send("message", "Metadata updated successfully");
  }
}
