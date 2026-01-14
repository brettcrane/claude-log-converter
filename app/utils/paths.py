"""Path utility functions."""

import base64
import logging

logger = logging.getLogger(__name__)


def decode_project_path(encoded_dir_name: str) -> str:
    """
    Decode a Claude project directory name to get the original path.

    Claude encodes project paths as: -{base64_encoded_path}
    Example: -L2hvbWUvdXNlci9jb2Rl -> /home/user/code
    """
    if not encoded_dir_name.startswith("-"):
        return encoded_dir_name

    encoded_part = encoded_dir_name[1:]  # Remove leading dash

    # Add padding if needed
    padding_needed = 4 - (len(encoded_part) % 4)
    if padding_needed != 4:
        encoded_part += "=" * padding_needed

    try:
        decoded_bytes = base64.b64decode(encoded_part, validate=True)
        return decoded_bytes.decode("utf-8")
    except (ValueError, UnicodeDecodeError) as e:
        logger.warning(f"Failed to decode project path '{encoded_dir_name}': {e}")
        return encoded_dir_name
