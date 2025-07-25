import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { rlAgentApi } from '../services/api';
import { INTERVIEW_CONFIG } from '../config/interview';
import { SelectChangeEvent } from '@mui/material/Select';
import Layout from '../components/layout/Layout';
import { Interview, Question, SessionStats } from '../types';

interface FormData {
  topic: string;
  difficulty: number;
}

const InterviewSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, setCurrentInterview, setLoading, setError } = useAppContext();
  
  const [formData, setFormData] = useState<FormData>({
    topic: 'ds',
    difficulty: 5
  });

  const handleStartInterview = async () => {
    setLoading(true);
    try {
      const response = await rlAgentApi.createInterview(
        formData.topic,
        formData.difficulty
      );

      const data = response.data;
      
      // Transform the first question to match our Question interface
      const firstQuestion: Question = {
        questionId: data.first_question.id,
        topic: data.first_question.topic,
        difficulty: data.first_question.difficulty,
        content: data.first_question.content,
        follow_up_questions: data.first_question.follow_up_questions,
        evaluation_points: data.first_question.evaluation_points,
        subtopic: data.first_question.subtopic,
        expected_time: data.first_question.expected_time_minutes
      };

      // Transform session stats to match our SessionStats interface
      const sessionStats: SessionStats = {
        questions_asked: data.session_stats.questions_asked,
        average_performance: data.session_stats.average_performance,
        current_topic: data.session_stats.current_topic,
        current_subtopic: data.session_stats.current_subtopic,
        current_difficulty: data.session_stats.current_difficulty,
        topic_performances: data.session_stats.topic_performances || {},
        learning_progress: data.session_stats.learning_progress || {}
      };
  
      // Create interview object
      const newInterview: Interview = {
        interviewId: data.session_id,
        userId: Date.now().toString(), // Generate temporary user ID
        currentQuestion: firstQuestion,
        currentQuestionIdx: 0,
        questions: [firstQuestion],
        answers: [],
        status: 'in_progress',
        difficulty: data.initial_difficulty,
        stats: sessionStats
      };
      
      // Store session ID in localStorage for persistence
      localStorage.setItem('interviewId', data.session_id);
      
      setCurrentInterview(newInterview);
      navigate('/interview');
    } catch (err) {
      console.error('Error creating interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to create interview');
    } finally {
      setLoading(false);
    }
  };

  const handleTopicChange = (event: SelectChangeEvent) => {
    setFormData(prev => ({ ...prev, topic: event.target.value }));
  };

  const handleDifficultyChange = (_event: Event, newValue: number | number[]) => {
    setFormData(prev => ({ ...prev, difficulty: newValue as number }));
  };
  
  return (
    <Layout>
      <Typography variant="h4" component="h1" gutterBottom>
        Interview Setup
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, mt: 3 }}>
        <Box sx={{ flex: 1 }}>
          {/* Interview Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Interview Settings
            </Typography>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>Topic</InputLabel>
                <Select
                  value={formData.topic}
                  onChange={handleTopicChange}
                  label="Topic"
                >
                  <MenuItem value="ds">Data Structures</MenuItem>
                  <MenuItem value="algo">Algorithms</MenuItem>
                  <MenuItem value="system_design">System Design</MenuItem>
                  <MenuItem value="dbms">Databases</MenuItem>
                  <MenuItem value="oops">Object-Oriented Programming</MenuItem>
                  <MenuItem value="os">Operating Systems</MenuItem>
                  <MenuItem value="cn">Computer Networks</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Typography gutterBottom>Difficulty Level</Typography>
                <Slider
                  value={formData.difficulty}
                  onChange={handleDifficultyChange}
                  min={INTERVIEW_CONFIG.DIFFICULTY_RANGE.MIN}
                  max={INTERVIEW_CONFIG.DIFFICULTY_RANGE.MAX}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            </Stack>
          </Paper>

          {/* RL Agent Info */}
          <Paper sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" gutterBottom>
              RL Agent Configuration
            </Typography>
            <Typography variant="body2" paragraph>
              Our AI system uses Reinforcement Learning to adapt the difficulty and 
              relevance of questions based on your performance.
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              Use Reinforcement Learning Agent: Enabled
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              The system will learn from your answers and adapt to your skill level
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
        <Button variant="outlined" onClick={() => navigate('/')}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleStartInterview}
          disabled={state.loading}
        >
          {state.loading ? <CircularProgress size={24} /> : 'Start Interview'}
        </Button>
      </Box>
    </Layout>
  );
};

export default InterviewSetupPage; 