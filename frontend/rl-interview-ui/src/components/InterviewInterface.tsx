import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  Tooltip,
  LinearProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import { useAppContext } from '../contexts/AppContext';
import { API_ENDPOINTS } from '../config/api';
import { Question, SessionStats, SubmitAnswerResponse } from '../types';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  backgroundColor: theme.palette.background.default
}));

const AnswerBox = styled(TextField)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  '& .MuiInputBase-root': {
    fontFamily: 'monospace'
  }
}));

const ResultCard = styled(Card)(({ theme }) => ({
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
  border: `1px solid ${theme.palette.divider}`
}));

interface InterviewInterfaceProps {
  onEnd: () => void;
}

interface EvaluationResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface RawEvaluationResponse {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface EvaluationResponse {
  evaluation: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
  current_state: {
    current_question: Question;
    session_stats: SessionStats;
  };
  next_state: {
    next_question: Question;
    next_difficulty: number;
    next_topic: string;
    next_subtopic: string;
    interview_complete: boolean;
  };
}

interface AnswerSubmissionRequest {
  question_id: string;
  answer: string;
  session_id: string;
}

// Add difficulty level helper with proper type
const getDifficultyInfo = (difficulty: number): { 
  label: string; 
  color: 'success' | 'warning' | 'error' | 'default' | 'primary' | 'secondary' | 'info' 
} => {
  if (difficulty <= 3) {
    return { label: 'Easy', color: 'success' };
  } else if (difficulty <= 7) {
    return { label: 'Medium', color: 'warning' };
  } else {
    return { label: 'Hard', color: 'error' };
  }
};

// Add difficulty progress color helper with proper type
const getDifficultyProgressColor = (difficulty: number): 'success' | 'warning' | 'error' | 'primary' | 'secondary' | 'info' => {
  if (difficulty <= 3) return 'success';
  if (difficulty <= 7) return 'warning';
  return 'error';
};

export const InterviewInterface: React.FC<InterviewInterfaceProps> = ({ onEnd }): JSX.Element => {
  const navigate = useNavigate();
  const { state: { currentInterview }, setCurrentInterview, setError: setAppError } = useAppContext();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    if (!currentInterview?.interviewId) {
      navigate('/');
      return;
    }
    
    if (!isInitialized) {
      fetchNextQuestion();
      setIsInitialized(true);
    }
  }, [currentInterview?.interviewId, isInitialized, navigate]);

  const fetchNextQuestion = async () => {
    if (!currentInterview?.interviewId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // If we have a next question in the current response, use that
      if (currentInterview.currentQuestion) {
        const nextQuestion: Question = {
          questionId: currentInterview.currentQuestion.questionId,
          topic: currentInterview.currentQuestion.topic,
          subtopic: currentInterview.currentQuestion.subtopic,
          difficulty: currentInterview.currentQuestion.difficulty,
          content: currentInterview.currentQuestion.content,
          follow_up_questions: currentInterview.currentQuestion.follow_up_questions,
          evaluation_points: currentInterview.currentQuestion.evaluation_points,
          expected_time: currentInterview.currentQuestion.expected_time || 5
        };
        setCurrentQuestion(nextQuestion);
        setResult(null);
        setAnswer('');
        setStartTime(Date.now());
        setIsLoading(false);
        return;
      }

      // Otherwise, redirect to home as something is wrong
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load next question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim() || !currentInterview?.interviewId) return;
    
    setIsEvaluating(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.SUBMIT_ANSWER(currentInterview.interviewId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          answer: answer.trim(),
          time_taken: (Date.now() - startTime) / 1000 // Convert to seconds
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData: SubmitAnswerResponse = await response.json();
      console.log('Response data:', responseData);

      // Handle evaluation result
      if (responseData.evaluation) {
        setResult({
          score: responseData.evaluation.score,
          feedback: responseData.evaluation.feedback,
          strengths: responseData.evaluation.strengths,
          improvements: responseData.evaluation.improvements
        });

        // Update interview stats
        if (responseData.current_state && currentInterview) {
          const updatedInterview = {
            ...currentInterview,
            currentQuestion: responseData.next_state.next_question,
            questions: [...currentInterview.questions, responseData.next_state.next_question],
            answers: [...currentInterview.answers, {
              questionId: currentQuestion?.questionId || '',
              answer: answer.trim(),
              score: responseData.evaluation.score,
              overall_feedback: responseData.evaluation.feedback,
              improvement_suggestions: responseData.evaluation.improvements
            }],
            stats: responseData.current_state.session_stats
          };
          setCurrentInterview(updatedInterview);
        }

        // Check if interview is complete
        if (responseData.next_state.interview_complete) {
          onEnd();
          return;
        }

        setQuestionsAnswered(prev => prev + 1);
        setTotalScore(prev => prev + responseData.evaluation.score);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
      setAppError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/')}>
          Return to Home
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <StyledPaper elevation={2}>
        <Stack direction="row" spacing={2} mb={2}>
          <Chip 
            label={`Topic: ${currentQuestion?.topic}`} 
            color="primary" 
            variant="outlined" 
          />
          <Tooltip title="Question difficulty level" arrow>
            <Box sx={{ minWidth: 200 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip 
                  label={`Difficulty: ${currentQuestion?.difficulty}/10`} 
                  color={getDifficultyInfo(currentQuestion?.difficulty || 5).color}
                  variant="filled"
                />
                <Chip 
                  label={getDifficultyInfo(currentQuestion?.difficulty || 5).label}
                  color={getDifficultyInfo(currentQuestion?.difficulty || 5).color}
                  variant="outlined"
                />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={(currentQuestion?.difficulty || 5) * 10}
                color={getDifficultyProgressColor(currentQuestion?.difficulty || 5)}
                sx={{ 
                  mt: 1, 
                  height: 8, 
                  borderRadius: 4,
                  bgcolor: 'grey.200'
                }}
              />
            </Box>
          </Tooltip>
          <Chip 
            label={`Score: ${totalScore}/${questionsAnswered * 10}`} 
            color="info" 
            variant="outlined" 
          />
        </Stack>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6">
            Question {questionsAnswered + 1}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip 
              size="small"
              label={getDifficultyInfo(currentQuestion?.difficulty || currentInterview?.difficulty || 5).label}
              color={getDifficultyInfo(currentQuestion?.difficulty || currentInterview?.difficulty || 5).color}
              variant="filled"
              sx={{ minWidth: 80 }}
            />
            <Typography variant="body2" color="text.secondary">
              ({(currentQuestion?.difficulty || currentInterview?.difficulty || 5).toFixed(1)}/10)
            </Typography>
          </Stack>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Box mb={3}>
          <ReactMarkdown>{currentQuestion?.content || ''}</ReactMarkdown>
        </Box>

        <AnswerBox
          fullWidth
          multiline
          rows={6}
          variant="outlined"
          placeholder="Type your answer here..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={isEvaluating || !!result}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button
            variant="contained"
            color="error"
            onClick={onEnd}
            sx={{ minWidth: '120px' }}
          >
            End Interview
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={isEvaluating || !answer.trim() || !!result}
            sx={{ minWidth: '120px' }}
          >
            {isEvaluating ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        </Box>
      </StyledPaper>

      {result && (
        <ResultCard>
          <CardContent>
            <Typography variant="h6" gutterBottom color={result.score >= 7 ? 'success.main' : 'error.main'}>
              Score: {result.score}/10
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Feedback:
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {result.feedback}
            </Typography>
            {result.strengths.length > 0 && (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Strengths:
                </Typography>
                <Box sx={{ backgroundColor: 'grey.100', p: 2, borderRadius: 1 }}>
                  <ReactMarkdown>{result.strengths.map((s: string) => `• ${s}`).join('\n')}</ReactMarkdown>
                </Box>
              </>
            )}
            {result.improvements.length > 0 && (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Areas for Improvement:
                </Typography>
                <Box sx={{ backgroundColor: 'grey.100', p: 2, borderRadius: 1 }}>
                  <ReactMarkdown>{result.improvements.map((i: string) => `• ${i}`).join('\n')}</ReactMarkdown>
                </Box>
              </>
            )}
          </CardContent>
        </ResultCard>
      )}
    </Box>
  );
};