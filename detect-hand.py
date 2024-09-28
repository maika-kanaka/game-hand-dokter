import cv2
import mediapipe as mp
import numpy as np
from pynput.mouse import Button, Controller

# Initialize Mediapipe Hand module
mp_hands = mp.solutions.hands
hands = mp_hands.Hands()
mouse = Controller()

# Initialize the camera
cap = cv2.VideoCapture(0)

# Initialize variables for smoothing
prev_hand_center = None
smooth_factor = 0.2

while True:
    # Read a frame from the camera
    ret, frame = cap.read()

    # Convert the BGR image to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Process the frame with Mediapipe Hand
    results = hands.process(rgb_frame)
    # Check if hands are detected
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            # mouse.press(Button.left)
            
            # Draw landmarks on the hand
            mp.solutions.drawing_utils.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

            # Get bounding box coordinates
            landmark_coords = [(int(lm.x * frame.shape[1]), int(lm.y * frame.shape[0])) for lm in hand_landmarks.landmark]
            hand_rect = cv2.boundingRect(np.array(landmark_coords))

            # Get the center of the hand bounding box
            hand_center = (hand_rect[0] + hand_rect[2] // 2, hand_rect[1] + hand_rect[3] // 2)

            # Smooth the hand position
            if prev_hand_center is None:
                prev_hand_center = hand_center
            else:
                hand_center = (
                    int(prev_hand_center[0] + smooth_factor * (hand_center[0] - prev_hand_center[0])),
                    int(prev_hand_center[1] + smooth_factor * (hand_center[1] - prev_hand_center[1]))
                )
                prev_hand_center = hand_center

            # Print the position of the hand
            print("Hand Position:", hand_center)
            mouse.position = hand_center

            # Draw a rectangle around the hand
            cv2.rectangle(frame, (int(hand_rect[0]), int(hand_rect[1])),
                          (int(hand_rect[0] + hand_rect[2]), int(hand_rect[1] + hand_rect[3])), (0, 255, 0), 2)

    # Display the result
    frame_resize = cv2.resize(frame, (400, 240))
    cv2.imshow('Hand Tracking', frame_resize)
    cv2.setWindowProperty('Hand Tracking', cv2.WND_PROP_TOPMOST, 1)

    # Break the loop when 'q' is pressed
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release the camera and close all windows
cap.release()
cv2.destroyAllWindows()