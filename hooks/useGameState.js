import { useCallback, useReducer } from "react";
import {
  COMPLETE_STATUS_LOST,
  COMPLETE_STATUS_WON,
  GUESS_LENGTH,
  MAX_GUESSES,
  STATUS_CORRECT,
  STATUS_INCORRECT,
  STATUS_PRESENT,
} from "../constants";

const ACTION_TYPE_ADD_PENDING_GUESS = "add-pending-guess";
const ACTION_TYPE_DELETE_PENDING_GUESS = "delete-pending-guess";
const ACTION_TYPE_SUBMIT_PENDING_GUESSES = "submit-pending-guesses";

const DEFAULT_STATE = {
  // If the game is complete, this field will be either "won" or "lost".
  // If this field is null, the game is still in progress.
  completeStatus: null,

  // State of keyboard keys.
  // Each key is a lower case letter (e.g. "a") which maps to its visual state.
  // If a key is not present, this indicates that it has not yet been used as part of a guess.
  // if the key is present, it will map to a status: "correct", "present", or "incorrect".
  letterKeys: {},

  // This is the pending word being guessed.
  pendingGuesses: [],

  // Nested array of guessed "words".
  // Each "word" is an array of tuples: guessed "letters" and guess statuses.
  // which in turn is represented by an object with descriptive properties.
  submittedGuesses: [],

  // This is the word being guessed.
  targetWord: null,
};

function reduce(state, action) {
  const { payload, type } = action;

  switch (type) {
    case ACTION_TYPE_ADD_PENDING_GUESS: {
      const { completeStatus, pendingGuesses } = state;
      const { letter } = payload;

      if (completeStatus != null) {
        return state;
      } else if (pendingGuesses.length >= GUESS_LENGTH) {
        return state;
      }

      return {
        ...state,
        pendingGuesses: [...pendingGuesses, letter],
      };
    }

    case ACTION_TYPE_DELETE_PENDING_GUESS: {
      const { completeStatus, pendingGuesses } = state;

      if (completeStatus) {
        return state;
      } else if (pendingGuesses.length === 0) {
        return state;
      }

      return {
        ...state,
        pendingGuesses: pendingGuesses.slice(0, pendingGuesses.length - 1),
      };
    }

    case ACTION_TYPE_SUBMIT_PENDING_GUESSES: {
      const {
        completeStatus,
        letterKeys,
        pendingGuesses,
        submittedGuesses,
        targetWord,
      } = state;

      if (completeStatus) {
        return state;
      } else if (pendingGuesses.length !== GUESS_LENGTH) {
        return state;
      }

      let newCompleteStatus = null;

      const targetWordLetterCount = {};
      for (let index = 0; index < targetWord.length; index++) {
        const letter = targetWord.charAt(index);
        if (targetWordLetterCount[letter] == null) {
          targetWordLetterCount[letter] = 0;
        }
        targetWordLetterCount[letter]++;
      }

      const newLetterKeys = { ...letterKeys };
      const newGuess = [];
      for (let index = 0; index < pendingGuesses.length; index++) {
        const letter = pendingGuesses[index];
        newGuess.push([letter, STATUS_INCORRECT]);

        if (newLetterKeys[letter] == null) {
          newLetterKeys[letter] = STATUS_INCORRECT;
        }
      }

      // First, look for any "correct" letters.
      // Then look for "present" letters (assuming we have remaining target word letters).
      for (let index = 0; index < newGuess.length; index++) {
        const tuple = newGuess[index];
        const letter = tuple[0];
        if (targetWordLetterCount[letter] > 0) {
          const isCorrect = targetWord.charAt(index) === letter;
          if (isCorrect) {
            targetWordLetterCount[letter]--;
            tuple[1] = STATUS_CORRECT;
            newLetterKeys[letter] = STATUS_CORRECT;
          }
        }
      }
      for (let index = 0; index < newGuess.length; index++) {
        const tuple = newGuess[index];
        const letter = tuple[0];
        if (targetWordLetterCount[letter] > 0) {
          const isPresent = targetWord.includes(letter);
          if (isPresent) {
            targetWordLetterCount[letter]--;
            tuple[1] = STATUS_PRESENT;

            if (newLetterKeys[letter] === STATUS_INCORRECT) {
              newLetterKeys[letter] = STATUS_PRESENT;
            }
          }
        }
      }

      const newWord = pendingGuesses.join("");
      if (newWord === targetWord) {
        newCompleteStatus = COMPLETE_STATUS_WON;
      } else if (submittedGuesses.length === MAX_GUESSES - 1) {
        newCompleteStatus = COMPLETE_STATUS_LOST;
      }

      return {
        ...state,
        completeStatus: newCompleteStatus,
        letterKeys: newLetterKeys,
        pendingGuesses: [],
        submittedGuesses: [...submittedGuesses, newGuess],
      };
    }

    default:
      throw new Error(`Unrecognized action "${type}"`);
  }
}

export default function useGameState(targetWord) {
  const [state, dispatch] = useReducer(reduce, {
    ...DEFAULT_STATE,
    targetWord,
  });

  const addPendingGuess = useCallback((letter) => {
    dispatch({
      type: ACTION_TYPE_ADD_PENDING_GUESS,
      payload: {
        letter,
      },
    });
  });

  const deletePendingGuess = useCallback(() => {
    dispatch({ type: ACTION_TYPE_DELETE_PENDING_GUESS });
  });

  const submitPendingGuesses = useCallback(() => {
    dispatch({ type: ACTION_TYPE_SUBMIT_PENDING_GUESSES });
  });

  return {
    addPendingGuess,
    deletePendingGuess,
    state,
    submitPendingGuesses,
  };
}