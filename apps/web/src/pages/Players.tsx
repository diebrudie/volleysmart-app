import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Filter, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Mock player data
const playersData = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `Player ${i + 1}`,
  email: `player${i + 1}@example.com`,
  positions: ['Setter', 'Outside Hitter', 'Libero'][i % 3],
  skillLevel: Math.floor(Math.random() * 10) + 1,
  availability: i % 2 === 0,
}));

const Players = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(
    { key: 'name', direction: 'ascending' }
  );
  const [filters, setFilters] = useState({
    position: "all",
    availability: "all",
  });

  // Sort players
  const sortedPlayers = [...playersData].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const aValue = a[sortConfig.key as keyof typeof a];
    const bValue = b[sortConfig.key as keyof typeof b];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      // For string fields
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      // For number fields
      return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  // Filter players
  const filteredPlayers = sortedPlayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          player.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = filters.position === "all" || player.positions === filters.position;
    
    const matchesAvailability = filters.availability === "all" || 
                                (filters.availability === "available" ? player.availability : !player.availability);
    
    return matchesSearch && matchesPosition && matchesAvailability;
  });

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: string) => {
    if (sortConfig?.key !== columnName) {
      return <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />;
    }
    return sortConfig.direction === 'ascending' 
      ? <ChevronUp className="h-4 w-4 ml-1" /> 
      : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const positions = Array.from(new Set(playersData.map(player => player.positions)));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Player Directory
              </h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Link to="/players/onboarding">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Player
                </Button>
              </Link>
            </div>
          </div>

          <Card className="mt-6">
            <CardHeader className="border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  All Players
                </CardTitle>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search players..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Select 
                      value={filters.position} 
                      onValueChange={(value) => setFilters({...filters, position: value})}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        {positions.map(position => (
                          <SelectItem key={position} value={position}>{position}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={filters.availability} 
                      onValueChange={(value) => setFilters({...filters, availability: value})}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Availability" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">
                        <button 
                          className="flex items-center hover:text-volleyball-primary transition-colors"
                          onClick={() => requestSort('name')}
                        >
                          Name {getSortIcon('name')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center hover:text-volleyball-primary transition-colors"
                          onClick={() => requestSort('email')}
                        >
                          Email {getSortIcon('email')}
                        </button>
                      </TableHead>
                      <TableHead>
                        Position
                      </TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center hover:text-volleyball-primary transition-colors"
                          onClick={() => requestSort('skillLevel')}
                        >
                          Skill Level {getSortIcon('skillLevel')}
                        </button>
                      </TableHead>
                      <TableHead>
                        Availability
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No players found. Try adjusting your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPlayers.map((player) => (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium">{player.name}</TableCell>
                          <TableCell>{player.email}</TableCell>
                          <TableCell>{player.positions}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">Level {player.skillLevel}</Badge>
                          </TableCell>
                          <TableCell>
                            {player.availability ? (
                              <Badge>Available</Badge>
                            ) : (
                              <Badge variant="outline">Unavailable</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/players/${player.id}`}>
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Players;
